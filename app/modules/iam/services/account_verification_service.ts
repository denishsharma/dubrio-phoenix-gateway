import type QueueVerificationEmailPayload from '#modules/iam/payloads/account_verification/queue_verification_email_payload'
import type VerifyTokenPayload from '#modules/iam/payloads/account_verification/verify_token_payload'
import { CacheNameSpace } from '#constants/cache_namespace'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import SchemaError from '#core/schema/errors/schema_error'
import SendVerificationLinkJob from '#modules/iam/jobs/send_verification_link_job'
import GenerateAccountVerificationTokenDetailPayload from '#modules/iam/payloads/account_verification/generate_account_verification_token_detail_payload'
import StringMixerService from '#shared/common/services/string_mixer_service'
import cache from '@adonisjs/cache/services/main'
import { } from '@adonisjs/core/helpers'
import queue from '@rlanz/bull-queue/services/main'
import { Duration, Effect, pipe, Schema } from 'effect'

export default class AccountVerificationService {
  effectGenerateTokenDetails(payload: GenerateAccountVerificationTokenDetailPayload) {
    return Effect.gen(function* () {
      const stringMixer = yield* StringMixerService
      const errorConversion = yield* ErrorConversionService

      const token = yield* stringMixer.encode(payload.user_identifier, payload.email)

      const details = yield* pipe(
        {
          user_identifier: payload.user_identifier,
          email: payload.email,
          token: {
            value: token.value,
            key: token.key,
          },
        },
        Schema.decode(
          Schema.Struct({
            user_identifier: Schema.ULID,
            email: Schema.String,
            token: Schema.Struct({
              value: Schema.String,
              key: Schema.String,
            }),
          }),
          { errors: 'all' },
        ),
        SchemaError.fromParseError('Unexpected error occurred while decoding the token details for caching.'),
      )

      yield* Effect.tryPromise({
        try: () => cache
          .namespace(CacheNameSpace.ACCOUNT_VERIFICATION_TOKEN)
          .set({
            key: payload.user_identifier,
            value: details,
            ttl: Duration.toMillis(payload.duration),
          }),
        catch: errorConversion.toUnknownError('Unexpected error occurred while caching the token details.'),
      })

      return details
    })
  }

  async generateTokenDetails(payload: GenerateAccountVerificationTokenDetailPayload) {
    return await Effect.runPromise(
      this.effectGenerateTokenDetails(payload).pipe(
        Effect.provide(StringMixerService.Default),
        Effect.provide(ErrorConversionService.Default),
      ),
    )
  }

  async queueVerificationEmail(payload: QueueVerificationEmailPayload) {
    const program = Effect.gen(this, function* () {
      const errorConversion = yield* ErrorConversionService

      const details = yield* pipe(
        Effect.tryPromise({
          try: () => cache
            .namespace(CacheNameSpace.ACCOUNT_VERIFICATION_TOKEN)
            .get<unknown>({ key: payload.user_identifier }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving cached token details.'),
        }),
        Effect.flatMap(
          data => pipe(
            data,
            Schema.decodeUnknown(
              Schema.Struct({
                user_identifier: Schema.ULID,
                email: Schema.String,
                token: Schema.Struct({
                  value: Schema.String,
                  key: Schema.String,
                }),
              }),
              { errors: 'all' },
            ),
            SchemaError.fromParseError('Unexpected error occurred while decoding the cached token details.'),
          ),
        ),
        Effect.catchTag('@error/internal/schema', () => Effect.gen(this, function* () {
          return yield* this.effectGenerateTokenDetails(
            GenerateAccountVerificationTokenDetailPayload.make({
              user_identifier: payload.user_identifier,
              email: payload.email,
              duration: payload.duration,
            }),
          )
        })),
      )

      yield* Effect.tryPromise({
        try: () => queue.dispatch(SendVerificationLinkJob, {
          email: details.email,
          verificationLink: `http://localhost:3000/account/verify/${details.token.value}?k=${details.token.key}`,
        }),
        catch: errorConversion.toUnknownError('Unexpected error occurred while dispatching the verification email job.'),
      })
    })

    return await Effect.runPromise(
      program.pipe(
        Effect.provide(StringMixerService.Default),
        Effect.provide(ErrorConversionService.Default),
      ),
    )
  }

  async verifyToken(payload: VerifyTokenPayload) {
    const program = Effect.gen(function* () {
      const stringMixer = yield* StringMixerService
      const errorConversion = yield* ErrorConversionService

      const decodedDetails = yield* stringMixer.decode(payload.token, payload.key)
      if (!Array.isArray(decodedDetails) || decodedDetails.length !== 2) {
        throw new Error('Invalid token format: Decoded details must contain userIdentifier and email.')
      }
      const [userIdentifier, email] = decodedDetails

      const cachedDetails = yield* pipe(
        Effect.tryPromise({
          try: () => cache
            .namespace(CacheNameSpace.ACCOUNT_VERIFICATION_TOKEN)
            .get({ key: userIdentifier }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving cached token details.'),
        }),
        Effect.flatMap(
          data => pipe(
            data,
            Schema.decodeUnknown(
              Schema.Struct({
                user_identifier: Schema.ULID,
                email: Schema.String,
                token: Schema.Struct({
                  value: Schema.String,
                  key: Schema.String,
                }),
              }),
              { errors: 'all' },
            ),
            SchemaError.fromParseError('Unexpected error occurred while decoding the cached token details.'),
          ),
        ),
      )

      // compare the decoded details with the cached details
      if (!cachedDetails
        || cachedDetails.user_identifier !== userIdentifier
        || cachedDetails.email !== email
        || cachedDetails.token.value !== payload.token
        || cachedDetails.token.key !== payload.key) {
        throw new Error('Token validation failed: Invalid or expired token.')
      }

      // Delete the token from cache after use
      yield* Effect.tryPromise({
        try: () => cache
          .namespace(CacheNameSpace.ACCOUNT_VERIFICATION_TOKEN)
          .delete({ key: payload.token }),
        catch: errorConversion.toUnknownError('Unexpected error occurred while deleting the token from cache.'),
      })

      return {
        user_identifier: cachedDetails.user_identifier,
        email: cachedDetails.email,
      }
    })

    return await Effect.runPromise(
      program.pipe(
        Effect.provide(StringMixerService.Default),
        Effect.provide(ErrorConversionService.Default),
      ),
    )
  }

  // async verifyToken(token: string): Promise<TokenDetails | null> {
  //   /**
  //    * ! DELETE THE TOKEN FROM CACHE AFTER USE
  //    * ! This is important to prevent reuse of the token.
  //    */

  //   // Look up the token in cache to get the key and details
  //   const tokenDetails = await cache
  //     .namespace(CacheNameSpace.ACCOUNT_VERIFICATION_TOKEN)
  //     .get<TokenDetails | null>({ key: token })
  //   if (!tokenDetails) { return null }
  //   const [userId, email] = StringMixerService.decode(token, tokenDetails.key)
  //   if (userId !== tokenDetails.userId || email !== tokenDetails.email) {
  //     return null
  //   }
  //   return tokenDetails
  // }
}
