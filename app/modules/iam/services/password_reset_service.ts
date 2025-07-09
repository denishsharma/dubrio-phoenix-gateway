import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type ForgotPasswordPayload from '#modules/iam/payloads/authentication/forgot_password_payload'
import type ResetPasswordPayload from '#modules/iam/payloads/authentication/reset_password_payload'
import type { Spread } from 'type-fest'
import { CacheNamespace } from '#constants/cache_namespace'
import DatabaseService from '#core/database/services/database_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import { WithQueueJob } from '#core/queue_job/constants/with_queue_job'
import QueueJobService from '#core/queue_job/services/queue_job_service'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import User from '#models/user_model'
import InvalidResetTokenException from '#modules/iam/exceptions/invalid_reset_token_exception'
import UserNotFoundException from '#modules/iam/exceptions/user_not_found_exception'
import SendPasswordResetEmailJob from '#modules/iam/jobs/send_password_reset_email_job'
import PasswordResetTokenDetails, { PasswordResetToken } from '#modules/iam/schemas/authentication/password_reset_token_details_schema'
import StringMixerService from '#shared/common/services/string_mixer_service'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import cache from '@adonisjs/cache/services/main'
import is from '@adonisjs/core/helpers/is'
import { Duration, Effect, flow, pipe, Redacted, Schema } from 'effect'

export default class PasswordResetService extends Effect.Service<PasswordResetService>()('@service/modules/iam/password_reset', {
  dependencies: [
    DatabaseService.Default,
    ErrorConversionService.Default,
    QueueJobService.Default,
    StringMixerService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const errorConversion = yield* ErrorConversionService
    const queueJob = yield* QueueJobService
    const stringMixer = yield* StringMixerService
    const telemetry = yield* TelemetryService

    function generateForgotPasswordToken(payload: ProcessedDataPayload<ForgotPasswordPayload>) {
      return Effect.gen(function* () {
        /**
         * Check if user exists with the provided email
         */
        const user = yield* Effect.tryPromise({
          try: () => User
            .query()
            .where('email', payload.email_address)
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while checking if user exists.'),
        })

        if (is.nullOrUndefined(user)) {
          return yield* new UserNotFoundException('No user found with the provided email address.')
        }

        /**
         * Generate a token using the string mixer service.
         * The token is a combination of the user identifier and email address.
         */
        const token = yield* pipe(
          stringMixer.encode(user.uid, user.email!),
          Effect.flatMap(
            flow(
              Schema.decode(PasswordResetToken, { errors: 'all' }),
              SchemaError.fromParseError('Unexpected error occurred while decoding the password reset token.'),
            ),
          ),
        )

        /**
         * Create the details object that will be cached.
         */
        const details = yield* Effect.suspend(() => pipe(
          {
            user_identifier: UserIdentifier.make(user.uid),
            email_address: user.email!,
            duration: Duration.minutes(15), // 15 minutes expiry
            token,
          },
          Schema.decode(PasswordResetTokenDetails, { errors: 'all' }),
          SchemaError.fromParseError('Unexpected error occurred while decoding the password reset token details.'),
          Effect.flatMap(
            data => Effect.gen(function* () {
              const cachedDetails = yield* pipe(
                {
                  user_identifier: data.user_identifier.value,
                  email_address: data.email_address,
                  token: data.token,
                  duration: Duration.toMillis(data.duration),
                },
                Schema.encode(
                  Schema.extend(
                    PasswordResetTokenDetails.pipe(
                      Schema.omit('user_identifier'),
                      Schema.omit('duration'),
                    ),
                    Schema.Struct({
                      user_identifier: Schema.ULID,
                      duration: Schema.Number,
                    }),
                  ),
                  { errors: 'all' },
                ),
                SchemaError.fromParseError('Unexpected error occurred while encoding the password reset token details for caching.'),
              )

              return { original: data, cached: cachedDetails }
            }),
          ),
        )).pipe(telemetry.withTelemetrySpan('decode_password_reset_token_details'))

        /**
         * Cache the token details.
         * The cache key is the user identifier and the value is the cached details.
         * The TTL is set to 15 minutes for security.
         */
        yield* Effect.tryPromise({
          try: async () => {
            return await cache
              .namespace(CacheNamespace.PASSWORD_RESET_TOKEN)
              .set({
                key: details.cached.user_identifier,
                value: details.cached,
                ttl: Duration.toMillis(details.original.duration),
              })
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while caching the password reset token details.', { context: { data: { user_identifier: user.uid } } }),
        }).pipe(telemetry.withTelemetrySpan('cache_password_reset_token_details'))

        /**
         * Queue password reset email
         */
        const job = yield* Effect.suspend(() => pipe(
          WithQueueJob(
            SendPasswordResetEmailJob,
            () => ({
              email_address: details.original.email_address,
              token: details.original.token,
            }),
          ),
          queueJob.dispatch,
        )).pipe(telemetry.withTelemetrySpan('dispatch_password_reset_email_job'))

        return { user, job }
      }).pipe(telemetry.withTelemetrySpan('generate_reset_token'))
    }

    function resetPassword(payload: ProcessedDataPayload<ResetPasswordPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Decode the token to get user identifier
         */
        const userIdentifier = yield* pipe(
          stringMixer.decode(payload.token, payload.key),
          Effect.map(([identifier]) => identifier),
          Effect.catchTag('@error/internal/string_mixer', () => Effect.fail(new InvalidResetTokenException('Invalid or expired password reset token.'))),
        )

        /**
         * Get the cached token details from the cache using the user identifier.
         */
        const cachedDetails = yield* Effect.tryPromise({
          try: async () => {
            return await cache
              .namespace(CacheNamespace.PASSWORD_RESET_TOKEN)
              .get<Spread<Omit<typeof PasswordResetTokenDetails.Encoded, 'user_identifier' | 'duration'>, { user_identifier: string; duration: number }> | null | undefined>({
                key: userIdentifier,
                defaultValue: null,
              })
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while getting password reset token from cache.', { context: { data: { user_identifier: userIdentifier } } }),
        }).pipe(telemetry.withTelemetrySpan('get_password_reset_token_from_cache'))

        /**
         * If the cached details are not found, throw an InvalidResetTokenException.
         */
        if (is.nullOrUndefined(cachedDetails)) {
          return yield* Effect.fail(new InvalidResetTokenException('Password reset token has expired or is invalid.'))
        }

        /**
         * Verify that the token matches
         */
        if (cachedDetails.token.value !== payload.token || cachedDetails.token.key !== payload.key) {
          return yield* Effect.fail(new InvalidResetTokenException('Invalid password reset token.'))
        }

        /**
         * Delete the token from cache to prevent reuse
         */
        yield* Effect.tryPromise({
          try: async () => {
            return await cache.namespace(CacheNamespace.PASSWORD_RESET_TOKEN).delete({
              key: userIdentifier,
            })
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while deleting password reset token from cache.', { context: { data: { user_identifier: userIdentifier } } }),
        })

        /**
         * Get the user and update their password
         */
        const user = yield* Effect.tryPromise({
          try: () => User
            .query({ client: trx })
            .where('uid', userIdentifier)
            .firstOrFail(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while finding user for password reset.'),
        })

        /**
         * Update the user's password
         */
        yield* Effect.tryPromise({
          try: async () => {
            user.password = Redacted.value(payload.password)
            return await user.save()
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while updating user password.', { context: { data: { user_identifier: user.uid } } }),
        })

        return user
      }).pipe(telemetry.withTelemetrySpan('reset_password'))
    }

    return {
      /**
       * Generates a password reset token and queues a password reset email.
       *
       * @param payload - The payload containing the email address
       */
      generateResetToken: generateForgotPasswordToken,

      /**
       * Resets the user's password using the provided reset token.
       *
       * @param payload - The payload containing token, key, and new password
       */
      resetPassword,
    }
  }),
}) {}
