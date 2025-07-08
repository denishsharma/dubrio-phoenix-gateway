import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type AuthenticationCredentialsPayload from '#modules/iam/payloads/authentication/authentication_credentials_payload'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import HttpContext from '#core/http/contexts/http_context'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import User from '#models/user_model'
import AccountVerificationRequiredException from '#modules/iam/exceptions/account_verification_required_exception'
import InvalidCredentialsException from '#modules/iam/exceptions/invalid_credentials_exception'
import UnauthorizedException from '#modules/iam/exceptions/unauthorized_exception'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { errors as authErrors } from '@adonisjs/auth'
import is from '@adonisjs/core/helpers/is'
import { Effect, Match, Redacted, Ref } from 'effect'

export default class AuthenticationService extends Effect.Service<AuthenticationService>()('@service/modules/iam/authentication', {
  dependencies: [ErrorConversionService.Default, TelemetryService.Default],
  effect: Effect.gen(function* () {
    const errorConversion = yield* ErrorConversionService
    const telemetry = yield* TelemetryService

    function authenticateWithCredentials(payload: ProcessedDataPayload<AuthenticationCredentialsPayload>) {
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
    }
  }),
}) {}
