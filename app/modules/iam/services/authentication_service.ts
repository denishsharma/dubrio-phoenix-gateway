import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type AuthenticateWithCredentialsPayload from '#modules/iam/payloads/authentication/authenticate_with_credentials_payload'
import type QueuePasswordResetEmailPayload from '#modules/iam/payloads/authentication/queue_password_reset_email_payload'
import type RegisterUserPayload from '#modules/iam/payloads/authentication/register_user_payload'
import type ResetPasswordPayload from '#modules/iam/payloads/authentication/reset_password_payload'
import { CacheNamespace } from '#constants/cache_namespace'
import { DataSource } from '#constants/data_source'
import DatabaseService from '#core/database/services/database_service'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import HttpContext from '#core/http/contexts/http_context'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import { WithQueueJob } from '#core/queue_job/constants/with_queue_job'
import QueueJobService from '#core/queue_job/services/queue_job_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import User from '#models/user_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import AccountVerificationRequiredException from '#modules/iam/exceptions/account_verification_required_exception'
import InvalidCredentialsException from '#modules/iam/exceptions/invalid_credentials_exception'
import InvalidPasswordResetTokenException from '#modules/iam/exceptions/invalid_password_reset_token_exception'
import PasswordReuseException from '#modules/iam/exceptions/password_reuse_exception'
import UnauthorizedException from '#modules/iam/exceptions/unauthorized_exception'
import SendPasswordResetEmailJob from '#modules/iam/jobs/send_password_reset_email_job'
import GeneratePasswordResetTokenPayload from '#modules/iam/payloads/authentication/generate_password_reset_token_payload'
import PasswordResetToken from '#modules/iam/schemas/authentication/password_reset_token'
import StringMixerService from '#shared/common/services/string_mixer_service'
import { RetrieveUserUsingIdentifier } from '#shared/retrieval_strategies/user_retrieval_strategy'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { errors as authErrors } from '@adonisjs/auth'
import cache from '@adonisjs/cache/services/main'
import is from '@adonisjs/core/helpers/is'
import hash from '@adonisjs/core/services/hash'
import { Duration, Effect, Exit, Match, pipe, Redacted, Ref } from 'effect'

export default class AuthenticationService extends Effect.Service<AuthenticationService>()('@service/modules/iam/authentication', {
  dependencies: [
    DatabaseService.Default,
    ErrorConversionService.Default,
    LucidModelRetrievalService.Default,
    QueueJobService.Default,
    StringMixerService.Default,
    TypedEffectService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const errorConversion = yield* ErrorConversionService
    const lucidModelRetrieval = yield* LucidModelRetrievalService
    const queueJob = yield* QueueJobService
    const stringMixer = yield* StringMixerService
    const typedEffectService = yield* TypedEffectService
    const telemetry = yield* TelemetryService

    function authenticateWithCredentials(payload: ProcessedDataPayload<AuthenticateWithCredentialsPayload>) {
      return Effect.gen(function* () {
        const { context } = yield* HttpContext
        const ctx = yield* context

        /**
         * Verify user credentials via email and password.
         */
        const user = yield* Effect.tryPromise({
          try: () => User.verifyCredentials(payload.email_address, Redacted.value(payload.password)),
          catch: Match.type().pipe(
            Match.when(Match.instanceOf(authErrors.E_INVALID_CREDENTIALS), () => new InvalidCredentialsException()),
            Match.orElse(errorConversion.toUnknownError('Unexpected error occurred while verifying credentials.')),
          ),
        }).pipe(telemetry.withTelemetrySpan('verify_user_credentials'))

        /**
         * This should never happen, but just in case,
         * we check if the user has an email address or not.
         * If the user does not have an email address, we return an exception.
         *
         * This is a safeguard to ensure that we do not proceed with an invalid user.
         */
        if (is.nullOrUndefined(user.email)) {
          return yield* new InvalidCredentialsException()
        }

        /**
         * Check if user account is verified.
         * If the user account is not verified, return an exception.
         */
        if (is.falsy(user.isAccountVerified)) {
          return yield* new AccountVerificationRequiredException({
            data: {
              user_identifier: UserIdentifier.make(user.uid),
              email_address: user.email,
            },
          })
        }

        /**
         * Authenticate the user using the session-based authentication.
         * This will create a session for the user and store it in the session store.
         */
        yield* Effect.tryPromise({
          try: () => ctx.auth.use('web').login(user),
          catch: errorConversion.toUnknownError('Unexpected error occurred while authenticate user using session.', { context: { data: { user_identifier: user.uid } } }),
        }).pipe(telemetry.withTelemetrySpan('authenticate_using_session'))

        return user
      }).pipe(telemetry.withTelemetrySpan('authenticate_with_credentials'))
    }

    function authenticateUsingSession(user: User) {
      return Effect.gen(function* () {
        const { context } = yield* HttpContext
        const ctx = yield* context

        /**
         * Authenticate the user using the session-based authentication.
         * This will create a session for the user and store it in the session store.
         */
        yield* Effect.tryPromise({
          try: () => ctx.auth.use('web').login(user),
          catch: errorConversion.toUnknownError('Unexpected error occurred while authenticate user using session.', { context: { data: { user_identifier: user.uid } } }),
        })
      }).pipe(telemetry.withTelemetrySpan('authenticate_using_session'))
    }

    const getAuthenticatedUser = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context

      return yield* Effect.sync(() => ctx.auth.user).pipe(
        Effect.flatMap((user) => {
          if (!user) { return Effect.fail(new UnauthorizedException()) }
          return Effect.succeed(user)
        }),
        typedEffectService.overrideSuccessType<User>(),
      )
    }).pipe(telemetry.withTelemetrySpan('get_authenticated_user'))

    function revokeCurrentAccessToken(user: User) {
      return Effect.tryPromise({
        try: async () => {
          if (user.currentAccessToken) {
            await User.accessTokens.delete(user, user.currentAccessToken.identifier)
            return true
          }
          return false
        },
        catch: errorConversion.toUnknownError('Unexpected error occurred while revoking current access token.', { context: { data: { user_identifier: user.uid } } }),
      })
    }

    const logout = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context

      const user = yield* getAuthenticatedUser

      const sessionRevokedRef = yield* Ref.make(false)
      const accessTokenRevokedRef = yield* Ref.make(false)

      yield* revokeCurrentAccessToken(user).pipe(
        Effect.flatMap(revoked => Ref.set(accessTokenRevokedRef, revoked)),
      )

      yield* Effect.tryPromise({
        try: async () => await ctx.auth.use('web').logout(),
        catch: errorConversion.toUnknownError('Unexpected error occurred while logging out the user.', { context: { data: { user_identifier: user.uid } } }),
      }).pipe(
        Effect.flatMap(() => Ref.set(sessionRevokedRef, true)),
        Effect.tapErrorTag('@error/internal/unknown', () => Ref.set(sessionRevokedRef, false)),
      )

      return {
        session: yield* sessionRevokedRef.get,
        token: yield* accessTokenRevokedRef.get,
      }
    }).pipe(telemetry.withTelemetrySpan('logout'))

    function registerUser(payload: ProcessedDataPayload<RegisterUserPayload>) {
      return Effect.gen(function* () {
        /**
         * Check if user already exists
         * This is done by checking if a user with the provided email address already exists in the database.
         * If a user with the provided email address already exists, we throw an exception.
         */
        let user = yield* Effect.tryPromise({
          try: () => User
            .query()
            .where('email', payload.email_address)
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while checking if user already exists.'),
        })

        if (is.truthy(user)) {
          return yield* new InvalidCredentialsException('User with this email address already exists.')
        }

        user = yield* Effect.tryPromise({
          try: () => User.create({
            email: payload.email_address,
            password: Redacted.value(payload.password),
            firstName: payload.first_name,
            lastName: payload.last_name,
            isAccountVerified: false,
            onboardingStatus: OnboardingStatus.NOT_STARTED,
          }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while creating user.'),
        })

        /**
         * Return the created user for the controller to handle email verification
         */
        return user
      }).pipe(telemetry.withTelemetrySpan('register_user'))
    }

    function generatePasswordResetToken(payload: ProcessedDataPayload<GeneratePasswordResetTokenPayload>) {
      return Effect.gen(function* () {
        /**
         * Generate a token using the string mixer service.
         * This token is used for the password reset functionality.
         */
        const token = yield* pipe(
          stringMixer.encode(payload.user_identifier.value),
          Effect.flatMap(data => PasswordResetToken.make(data)),
        )

        /**
         * Set the generated token in the cache with a TTL
         * based on the duration specified in the payload.
         */
        yield* Effect.tryPromise({
          try: async () => {
            return await cache.namespace(CacheNamespace.PASSWORD_RESET_TOKEN).set({
              key: payload.user_identifier.value,
              value: token.value,
              ttl: Duration.toMillis(payload.duration),
            })
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while setting password reset token in cache.', { context: { data: { user_identifier: payload.user_identifier.value } } }),
        }).pipe(telemetry.withTelemetrySpan('set_password_reset_token_in_cache'))

        /**
         * Return the generated token.
         */
        return token
      }).pipe(telemetry.withTelemetrySpan('generate_password_reset_token'))
    }

    function verifyPasswordResetToken(token: PasswordResetToken, once: boolean = false) {
      return Effect.gen(function* () {
        /**
         * Decode the token to get the user identifier.
         */
        const [userIdentifier] = yield* pipe(
          stringMixer.decode(token.value.value, token.value.key),
          Effect.catchTag('@error/internal/string_mixer', error => new InvalidPasswordResetTokenException(
            { data: { reason: 'token_invalid' } },
            undefined,
            { cause: error },
          )),
        )

        /**
         * Get the cached token from the cache using the user identifier.
         */
        const cachedToken = yield* Effect.tryPromise({
          try: async () => {
            /**
             * Retrieve the cached password reset token for the user.
             */
            return await cache
              .namespace(CacheNamespace.PASSWORD_RESET_TOKEN)
              .get<typeof PasswordResetToken.schema.Type | null | undefined>({
                key: userIdentifier,
                defaultValue: null,
              })
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while getting password reset token from cache.', { context: { data: { user_identifier: userIdentifier } } }),
        })

        /**
         * If the cached token is null or undefined, it means the token has expired.
         */
        if (is.nullOrUndefined(cachedToken)) {
          return yield* new InvalidPasswordResetTokenException({ data: { reason: 'token_expired' } })
        }

        /**
         * If token is not matching with the cached token,
         * it means the token is invalid or has been tampered with.
         */
        if (cachedToken.value !== token.value.value || cachedToken.key !== token.value.key) {
          return yield* new InvalidPasswordResetTokenException({ data: { reason: 'token_invalid' } })
        }

        /**
         * If the `once` flag is true, delete the cached token
         * after verifying it. This ensures that the token can only be used once.
         */
        yield* Effect.addFinalizer(
          Exit.match({
            onFailure: () => Effect.void,
            onSuccess: () => Effect.tryPromise({
              try: async () => {
                return await cache.namespace(CacheNamespace.PASSWORD_RESET_TOKEN).delete({ key: userIdentifier })
              },
              catch: errorConversion.toUnknownError('Unexpected error occurred while deleting password reset token from cache.', { context: { data: { user_identifier: userIdentifier } } }),
            }).pipe(
              Effect.when(() => once),
              Effect.ignore,
            ),
          }),
        )

        /**
         * If everything is fine, return the user identifier.
         */
        return UserIdentifier.make(userIdentifier)
      }).pipe(telemetry.withTelemetrySpan('verify_password_reset_token'))
    }

    function queuePasswordResetEmail(payload: ProcessedDataPayload<QueuePasswordResetEmailPayload>) {
      return Effect.gen(function* () {
        /**
         * Retrieve the cached password reset token for the user.
         *
         * If the token is not cached, we generate a new token
         * and cache it for the specified duration.
         *
         * If the token is cached, we decode it
         * and return it as a PasswordResetToken.
         */
        const token = yield* pipe(
          Effect.tryPromise({
            try: async () => {
              return await cache
                .namespace(CacheNamespace.PASSWORD_RESET_TOKEN)
                .get<typeof PasswordResetToken.schema.Type | null | undefined>({
                  key: payload.user.user_identifier.value,
                  defaultValue: null,
                })
            },
            catch: errorConversion.toUnknownError('Unexpected error occurred while getting password reset token from cache.', { context: { data: { user_identifier: payload.user.user_identifier.value } } }),
          }),
          Effect.flatMap(
            Match.type<typeof PasswordResetToken.schema.Type | null | undefined>().pipe(
              /**
               * If the token is not cached, we generate a new token
               * and cache it for the specified duration.
               */
              Match.when(
                is.nullOrUndefined,
                () => Effect.suspend(() => pipe(
                  DataSource.known({
                    user_identifier: payload.user.user_identifier,
                    duration: payload.duration,
                  }),
                  GeneratePasswordResetTokenPayload.fromSource(),
                  Effect.flatMap(generatePasswordResetToken),
                )).pipe(telemetry.withTelemetrySpan('generate_and_cache_password_reset_token')),
              ),

              /**
               * If the token is cached, we decode it
               * and return it as a PasswordResetToken.
               */
              Match.orElse(data => PasswordResetToken.make(data)),
            ),
          ),
        )

        /**
         * Dispatch the job to send the forgot password email.
         */
        return yield* pipe(
          WithQueueJob(
            SendPasswordResetEmailJob,
            () => ({
              email_address: payload.user.email_address,
              token: token.value,
              expires_in_millis: Duration.toMillis(payload.duration),
            }),
          ),
          queueJob.dispatch,
          Effect.map(job => ({ id: job.id })),
        ).pipe(telemetry.withTelemetrySpan('dispatch_send_password_reset_email_job'))
      }).pipe(telemetry.withTelemetrySpan('queue_password_reset_email'))
    }

    function resetPassword(payload: ProcessedDataPayload<ResetPasswordPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Extract the user identifier from the payload based on the mode.
         * If the mode is 'direct', we use the user identifier directly.
         * If the mode is 'token', we verify the password reset token to get the user identifier.
         */
        const userIdentifier = yield* payload.mode === 'direct'
          ? Effect.succeed(payload.user_identifier)
          : verifyPasswordResetToken(payload.token, true)

        /**
         * Retrieve the user from the database using the user identifier.
         * If the user is not found, an InvalidPasswordResetTokenException is thrown.
         */
        const user = yield* pipe(
          WithRetrievalStrategy(
            RetrieveUserUsingIdentifier,
            retrieve => retrieve(userIdentifier),
            {
              select: ['password'],
              exception: {
                throw: true,
              },
              query: {
                client: trx,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
          Effect.catchTag('@error/exception/resource_not_found', () => new InvalidPasswordResetTokenException({ data: { reason: 'user_not_found' } })),
        )

        /**
         * Check if the new password is the same as the previous password.
         * If it is, throw a PasswordReuseException.
         *
         * This is done to prevent users from reusing their previous passwords,
         * which is a common security practice to ensure that users choose strong and unique passwords.
         */
        yield* pipe(
          Effect.tryPromise({
            try: async () => {
              if (is.nullOrUndefined(user.password)) { return false }
              return await hash.verify(user.password, Redacted.value(payload.password))
            },
            catch: errorConversion.toUnknownError('Unexpected error occurred while verifying the user password.', { context: { data: { user_identifier: userIdentifier } } }),
          }),
          Effect.flatMap(
            Match.type<boolean>().pipe(
              Match.when(true, () => new PasswordReuseException('New password cannot be the same as the previous password. Please choose a different password.')),
              Match.when(false, () => Effect.void),
              Match.exhaustive,
            ),
          ),
        )

        /**
         * Update the user's password with the new password provided in the payload.
         * The password is redacted to ensure it is not logged or exposed in any way.
         */
        yield* Effect.tryPromise({
          try: async () => {
            user.password = Redacted.value(payload.password)
            return await user.save()
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while updating the user password.', { context: { data: { user_identifier: userIdentifier } } }),
        })
      }).pipe(telemetry.withTelemetrySpan('reset_password'))
    }

    return {
      /**
       * Authenticate a user with their credentials.
       * This will perform session-based authentication after verifying the user's credentials.
       *
       * @param payload - The authentication credentials payload.
       */
      authenticateWithCredentials,

      /**
       * Authenticate a user using session-based authentication.
       *
       * This is typically used after the user has been verified
       * with their credentials and we want to establish a session.
       *
       * @param user - The user to authenticate.
       */
      authenticateUsingSession,

      /**
       * Get the currently authenticated user from the HTTP context.
       * If no user is authenticated, it will throw an UnauthorizedException.
       */
      getAuthenticatedUser,

      /**
       * Revoke the current access token for the user.
       * This is typically used when the user logs out or when the access token needs to be invalidated.
       *
       * @param user - The user whose access token should be revoked.
       */
      revokeCurrentAccessToken,

      /**
       * Log out the currently authenticated user.
       * This will revoke the session and access token if they exist.
       */
      logout,

      /**
       * Register a new user.
       * Creates a new user account with the provided details.
       *
       * @param payload - The registration payload containing user details.
       */
      registerUser,

      /**
       * Generate a password reset token for the user.
       * This token is used to reset the user's password.
       *
       * @param payload - The payload containing user identifier and duration for the token.
       */
      generatePasswordResetToken,

      /**
       * Verify a password reset token.
       * This checks if the token is valid and has not expired.
       *
       * @param token - The password reset token to verify.
       * @param once - If true, the token will be deleted after verification.
       */
      verifyPasswordResetToken,

      /**
       * Queue a password reset email for the user.
       * This will send an email to the user with instructions on how to reset their password.
       *
       * @param payload - The payload containing user details and token duration.
       */
      queuePasswordResetEmail,

      /**
       * Reset a user's password.
       * This will update the user's password to the new password provided in the payload.
       *
       * @param payload - The payload containing details for resetting the password.
       */
      resetPassword,
    }
  }),
}) {}
