import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type { UserModelFields } from '#models/user_model'
import type QueueVerificationEmailPayload from '#modules/iam/payloads/account/queue_verification_email_payload'
import type { Spread } from 'type-fest'
import { CacheNamespace } from '#constants/cache_namespace'
import { DataSource } from '#constants/data_source'
import DatabaseService from '#core/database/services/database_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import { WithQueueJob } from '#core/queue_job/constants/with_queue_job'
import QueueJobService from '#core/queue_job/services/queue_job_service'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import NoSuchElementError from '#errors/no_such_element_error'
import InvalidAccountVerificationTokenException from '#modules/iam/exceptions/invalid_account_verification_token_exception'
import SendAccountVerificationEmailJob from '#modules/iam/jobs/send_account_verification_email_job'
import GenerateVerificationTokenPayload from '#modules/iam/payloads/account/generate_verification_token_payload'
import AccountVerificationToken from '#modules/iam/schemas/account/account_verification_token'
import AccountVerificationTokenDetails from '#modules/iam/schemas/account/account_verification_token_details_schema'
import StringMixerService from '#shared/common/services/string_mixer_service'
import { RetrieveUserUsingIdentifier } from '#shared/retrieval_strategies/user_retrieval_strategy'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import cache from '@adonisjs/cache/services/main'
import is from '@adonisjs/core/helpers/is'
import { Duration, Effect, Exit, Match, pipe, Schema } from 'effect'

export default class AccountVerificationService extends Effect.Service<AccountVerificationService>()('@service/modules/iam/account_verification', {
  dependencies: [
    DatabaseService.Default,
    ErrorConversionService.Default,
    LucidModelRetrievalService.Default,
    QueueJobService.Default,
    StringMixerService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const errorConversion = yield* ErrorConversionService
    const lucidModelRetrieval = yield* LucidModelRetrievalService
    const queueJob = yield* QueueJobService
    const stringMixer = yield* StringMixerService
    const telemetry = yield* TelemetryService

    function generateTokenDetails(payload: ProcessedDataPayload<GenerateVerificationTokenPayload>) {
      return Effect.gen(function* () {
        /**
         * Generate a token using the string mixer service.
         * The token is a combination of the user identifier and email address.
         */
        const token = yield* pipe(
          stringMixer.encode(payload.user.identifier.value, payload.user.email_address),
          Effect.flatMap(data => AccountVerificationToken.make(data, { error: { message: 'Unexpected error occurred while creating the account verification token.' } })),
        )

        /**
         * Create the details object that will be cached.
         */
        const details = yield* Effect.suspend(() => pipe(
          AccountVerificationTokenDetails.make(
            {
              user_identifier: payload.user.identifier,
              email_address: payload.user.email_address,
              duration: payload.duration,
              token: token.value,
            },
            {
              error: {
                message: 'Unexpected error occurred while creating the account verification token details.',
              },
            },
          ),
          Effect.flatMap(
            data => Effect.gen(function* () {
              const cachedDetails = yield* pipe(
                {
                  user_identifier: data.value.user_identifier.value,
                  email_address: data.value.email_address,
                  token: data.value.token,
                  duration: Duration.toMillis(data.value.duration),
                },
                Schema.encode(
                  Schema.extend(
                    AccountVerificationTokenDetails.schema.pipe(
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
                SchemaError.fromParseError('Unexpected error occurred while encoding the account verification token details for caching.'),
              )

              return { original: data, cached: cachedDetails }
            }),
          ),
        )).pipe(telemetry.withTelemetrySpan('decode_account_verification_token_details'))

        /**
         * Cache the token details.
         * The cache key is the user identifier and the value is the cached details.
         * The TTL is set to the duration specified in the payload.
         */
        yield* Effect.tryPromise({
          try: async () => {
            return await cache
              .namespace(CacheNamespace.ACCOUNT_VERIFICATION_TOKEN)
              .set({
                key: details.cached.user_identifier,
                value: details.cached,
                ttl: Duration.toMillis(details.original.value.duration),
              })
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while caching the account verification token details.', { context: { data: { user_identifier: payload.user.identifier.value } } }),
        }).pipe(telemetry.withTelemetrySpan('cache_account_verification_token_details'))

        /**
         * Return the original details object.
         * This will be used to send the verification email.
         */
        return details.original
      }).pipe(telemetry.withTelemetrySpan('generate_account_verification_token_details'))
    }

    function retrieveTokenDetails(tokenOrUserIdentifier: AccountVerificationToken | UserIdentifier) {
      return Effect.gen(function* () {
        /**
         * Extract the user identifier from the token or user identifier.
         * If the input is a UserIdentifier, use its value directly.
         * If the input is an AccountVerificationToken, decode it using the string mixer service.
         */
        const userIdentifier = yield* Match.type<AccountVerificationToken | UserIdentifier>().pipe(
          Match.when(UserIdentifier.is, identifier => Effect.succeed(identifier.value)),
          Match.orElse(
            (token: AccountVerificationToken) => pipe(
              stringMixer.decode(token.value.value, token.value.key),
              Effect.map(([identifier]) => identifier),
              Effect.catchTag('@error/internal/string_mixer', error => new InvalidAccountVerificationTokenException({ data: { reason: 'token_invalid' } }, undefined, { cause: error })),
            ),
          ),
        )(tokenOrUserIdentifier)

        /**
         * Get the cached token details from the cache using the user identifier.
         * If the cached details are not found, throw an InvalidAccountVerificationTokenException.
         */
        const cachedDetails = yield* Effect.tryPromise({
          try: async () => {
            return await cache
              .namespace(CacheNamespace.ACCOUNT_VERIFICATION_TOKEN)
              .get<Spread<Omit<typeof AccountVerificationTokenDetails.schema.Encoded, 'user_identifier' | 'duration'>, { user_identifier: string; duration: number }> | null | undefined>({
                key: userIdentifier,
                defaultValue: null,
              })
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while getting account verification token from cache.', { context: { data: { user_identifier: userIdentifier } } }),
        }).pipe(telemetry.withTelemetrySpan('get_account_verification_token_from_cache'))

        /**
         * If the cached details are not found, throw an InvalidAccountVerificationTokenException.
         * Otherwise, decode the cached details and return them.
         */
        if (is.nullOrUndefined(cachedDetails)) {
          return yield* new InvalidAccountVerificationTokenException({ data: { reason: 'token_expired' } })
        }

        /**
         * Decode the cached details into the AccountVerificationTokenDetails schema.
         */
        return yield* AccountVerificationTokenDetails.make(
          {
            user_identifier: UserIdentifier.make(cachedDetails.user_identifier),
            email_address: cachedDetails.email_address,
            token: cachedDetails.token,
            duration: Duration.millis(cachedDetails.duration),
          },
          {
            error: {
              message: 'Unexpected error occurred while decoding the account verification token details.',
            },
          },
        ).pipe(telemetry.withTelemetrySpan('decode_account_verification_token_details'))
      }).pipe(telemetry.withTelemetrySpan('retrieve_account_verification_token_details'))
    }

    function queueVerificationEmail(payload: ProcessedDataPayload<QueueVerificationEmailPayload>) {
      return Effect.gen(function* () {
        /**
         * Retrieve or generate the account verification token details.
         * If the token is cached, retrieve it from the cache.
         * If the token is not cached, generate a new one and cache it.
         */
        const tokenDetails = yield* pipe(
          Effect.tryPromise({
            try: async () => {
              return await cache
                .namespace(CacheNamespace.ACCOUNT_VERIFICATION_TOKEN)
                .get<Spread<Omit<typeof AccountVerificationTokenDetails.schema.Encoded, 'user_identifier' | 'duration'>, { user_identifier: string; duration: number }> | null | undefined>({
                  key: payload.user.identifier.value,
                  defaultValue: null,
                })
            },
            catch: errorConversion.toUnknownError('Unexpected error occurred while getting account verification token from cache.', { context: { data: { user_identifier: payload.user.identifier.value } } }),
          }),
          Effect.flatMap(
            Match.type<Spread<Omit<typeof AccountVerificationTokenDetails.schema.Encoded, 'user_identifier' | 'duration'>, { user_identifier: string; duration: number }> | null | undefined>().pipe(
              /**
               * If the token is not cached, generate a new one.
               */
              Match.when(
                is.nullOrUndefined,
                () => Effect.suspend(() => pipe(
                  DataSource.known({
                    user: {
                      identifier: payload.user.identifier,
                      email_address: payload.user.email_address,
                    },
                    duration: payload.duration,
                  }),
                  GenerateVerificationTokenPayload.fromSource(),
                  Effect.flatMap(generateTokenDetails),
                )).pipe(telemetry.withTelemetrySpan('generate_and_cache_verification_token')),
              ),

              /**
               * If the token is cached, decode it and return it.
               */
              Match.orElse(
                details => AccountVerificationTokenDetails.make(
                  {
                    user_identifier: UserIdentifier.make(details.user_identifier),
                    email_address: details.email_address,
                    token: details.token,
                    duration: Duration.millis(details.duration),
                  },
                  {
                    error: {
                      message: 'Unexpected error occurred while decoding the cached account verification token details.',
                    },
                  },
                ),
              ),
            ),
          ),
        )

        /**
         * Dispatch the SendAccountVerificationEmailJob with the token details.
         * The job will send the verification email to the user.
         */
        return yield* Effect.suspend(() => pipe(
          WithQueueJob(
            SendAccountVerificationEmailJob,
            () => ({
              email_address: tokenDetails.value.email_address,
              token: tokenDetails.value.token.value,
            }),
          ),
          queueJob.dispatch,
          Effect.map(job => ({ id: job.id })),
        )).pipe(telemetry.withTelemetrySpan('dispatch_verification_email_job'))
      }).pipe(telemetry.withTelemetrySpan('queue_verification_email'))
    }

    function verifyAccount(token: AccountVerificationToken) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the account verification token details from the cache.
         * If the token is not found or does not match the provided token, throw an InvalidAccountVerificationTokenException.
         */
        const details = yield* pipe(
          retrieveTokenDetails(token),
          Effect.tap(
            data => Effect.if((data.value.token.value.value !== token.value.value || data.value.token.value.key !== token.value.key), {
              onTrue: () => new InvalidAccountVerificationTokenException(
                { data: { reason: 'token_invalid' } },
                'Account verification token seems to be invalid.',
              ),
              onFalse: () => Effect.void,
            }),
          ),
        )

        /**
         * Delete the account verification token from the cache.
         * This is done to prevent the token from being reused.
         *
         * We are using `addFinalizer` to ensure that the cache deletion
         * happens only when the effect completes successfully.
         *
         * If the effect fails, the cache deletion will not be executed,
         * thus preserving the token in the cache for potential retries.
         */
        yield* Effect.addFinalizer(
          Exit.match({
            onFailure: () => Effect.void,
            onSuccess: () => Effect.tryPromise({
              try: async () => {
                return await cache
                  .namespace(CacheNamespace.ACCOUNT_VERIFICATION_TOKEN)
                  .delete({
                    key: details.value.user_identifier.value,
                  })
              },
              catch: errorConversion.toUnknownError('Unexpected error occurred while deleting account verification token from cache.', { context: { data: { user_identifier: details.value.user_identifier.value } } }),
            }).pipe(Effect.ignore),
          }),
        )

        /**
         * Retrieve the user using the user identifier from the token details.
         * If the user is not found, throw an InvalidAccountVerificationTokenException.
         */
        const user = yield* pipe(
          WithRetrievalStrategy(
            RetrieveUserUsingIdentifier,
            retrieve => retrieve(details.value.user_identifier),
            {
              query: {
                client: trx,
              },
              exception: {
                throw: true,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
          Effect.catchTag('@error/exception/resource_not_found', () => new InvalidAccountVerificationTokenException(
            { data: { reason: 'unknown' } },
            undefined,
            { cause: new NoSuchElementError('User not found for the provided account verification token.') },
          )),
        )

        /**
         * Update the user account with the verified status and username.
         */
        yield* Effect.tryPromise({
          try: async () => {
            user.merge({
              isAccountVerified: true,
            } satisfies Partial<UserModelFields>)

            return await user.save()
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while saving user.', { context: { data: { user_identifier: user.uid } } }),
        })
      }).pipe(telemetry.withTelemetrySpan('verify_account'))
    }

    return {
      /**
       * Generates a new account verification token and caches the details
       * against the user identifier.
       *
       * @param payload - The payload containing user details and duration for the token.
       */
      generateTokenDetails,

      /**
       * Retrieves the account verification token details from the cache
       * using the provided token or user identifier.
       *
       * @param tokenOrUserIdentifier - The account verification token or user identifier to retrieve details for.
       */
      retrieveTokenDetails,

      /**
       * Queues a job to send an account verification email to the user.
       * If the token is not cached, it generates a new token and caches it.
       *
       * @param payload - The payload containing user details and duration for the token.
       */
      queueVerificationEmail,

      /**
       * Verifies the account using the provided verification token.
       * It retrieves the token details, checks if the token is valid,
       * and updates the user account to mark it as verified.
       *
       * @param payload - The payload containing the verification token.
       */
      verifyAccount,
    }
  }),
}) {}
