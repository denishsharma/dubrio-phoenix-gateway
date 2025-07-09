import type User from '#models/user_model'
import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import type { SetNonNullable } from 'type-fest'
import { DataSource } from '#constants/data_source'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import UsingResponseEncoder from '#core/http/utils/using_response_encoder'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import UnauthorizedException from '#modules/iam/exceptions/unauthorized_exception'
import QueueVerificationEmailPayload from '#modules/iam/payloads/account/queue_verification_email_payload'
import AuthenticationCredentialsPayload from '#modules/iam/payloads/authentication/authentication_credentials_payload'
import RegisterUserPayload from '#modules/iam/payloads/authentication/register_user_payload'
import AccountVerificationService from '#modules/iam/services/account_verification_service'
import AuthenticationService from '#modules/iam/services/authentication_service'
import MaskingService from '#shared/common/services/masking_service'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import is from '@adonisjs/core/helpers/is'
import { Duration, Effect, Option, pipe, Schema } from 'effect'

export default class AuthenticationController {
  private telemetryScope = 'authentication-controller'

  /**
   * Handles user authentication using credentials such as email and password.
   *
   * This method processes the authentication request, verifies the credentials,
   * and returns user information if successful.
   *
   * If the account is not verified, it queues a verification email and returns
   * an UnauthorizedException with a message indicating that the account is not verified.
   */
  async authenticateWithCredentials(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const masking = yield* MaskingService
      const responseContext = yield* HttpResponseContextService
      const typedEffect = yield* TypedEffectService
      const telemetry = yield* TelemetryService

      const accountVerificationService = yield* AccountVerificationService
      const authenticationService = yield* AuthenticationService

      return yield* Effect.gen(function* () {
        const user = yield* pipe(
          AuthenticationCredentialsPayload.fromRequest(),
          Effect.flatMap(authenticationService.authenticateWithCredentials),

          /**
           * Catch AccountVerificationRequiredException and handle it
           * by queuing a verification email and return an UnauthorizedException
           * with a message indicating that the account is not verified.
           */
          Effect.catchTag(
            '@error/exception/account_verification_required',
            error => Effect.gen(function* () {
              const data = yield* error.data.pipe(
                SchemaError.fromParseError('Unexpected error occurred while decoding account verification required exception data.'),
                Effect.map(Option.getOrUndefined),
              )

              /**
               * If the data is null or undefined, we return an UnauthorizedException
               * with a generic message.
               *
               * This is fallback logic to ensure that we do not crash the application
               * if the data is not available or the schema is not valid.
               */
              if (is.nullOrUndefined(data)) {
                return yield* new UnauthorizedException('account_verification_required', 'Seems like your account is not verified yet. Please verify your account to proceed.')
              }

              /**
               * If the data is available, we proceed to queue the verification email.
               * We use the data from the exception to create a payload for the verification email.
               * The payload includes the user identifier and email address, along with a duration
               * for which the verification link will be valid.
               */
              const verificationJob = yield* pipe(
                DataSource.known({
                  user: {
                    identifier: data.user_identifier,
                    email_address: data.email_address,
                  },
                  duration: Duration.hours(1),
                }),
                QueueVerificationEmailPayload.fromSource(),
                Effect.flatMap(accountVerificationService.queueVerificationEmail),
              )

              /**
               * Annotate the response context with metadata about the user and the job.
               */
              yield* responseContext.annotateMetadata({
                user_id: data.user_identifier.value,
                job_id: verificationJob.id,
              })

              /**
               * Mask the email address to avoid exposing sensitive information
               * in the error message.
               */
              const maskedEmailAddress = yield* masking.maskEmail(data.email_address)
              return yield* new UnauthorizedException('account_verification_required', `Seems like your account is not verified yet. We have sent you an email with a verification link on ${maskedEmailAddress} to verify your account.`)
            }),
          ),

          /**
           * Ensure that the return type is User
           * and override the success type to SetNonNullable<User, 'email'>
           * because email will be always present after authentication.
           */
          typedEffect.ensureSuccessType<User>(),
          typedEffect.overrideSuccessType<SetNonNullable<User, 'email'>>(),
        )

        return yield* pipe(
          DataSource.known({
            firstName: user.firstName,
            lastName: user.lastName,
            emailAddress: user.email,
            isAccountVerified: user.isAccountVerified,
            onboardingStatus: user.onboardingStatus,
          }),
          UsingResponseEncoder(
            Schema.Struct({
              firstName: Schema.String,
              lastName: Schema.optional(Schema.NullOr(Schema.String)),
              emailAddress: Schema.String,
              isAccountVerified: Schema.Boolean,
              onboardingStatus: Schema.Enums(OnboardingStatus),
              // TODO: Fetch the default workspace and include it in the response
            }),
          ),
        )
      }).pipe(
        telemetry.withTelemetrySpan('authenticate_with_credentials'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  /**
   * Retrieves the authenticated user's information.
   */
  async me(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const typedEffect = yield* TypedEffectService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService

      return yield* Effect.gen(function* () {
        const user = yield* authenticationService.getAuthenticatedUser.pipe(
          typedEffect.ensureSuccessType<User>(),
          typedEffect.overrideSuccessType<SetNonNullable<User, 'email'>>(),
        )

        return yield* pipe(
          DataSource.known({
            firstName: user.firstName,
            lastName: user.lastName,
            email_address: user.email,
            isAccountVerified: user.isAccountVerified,
            onboardingStatus: user.onboardingStatus,
          }),
          UsingResponseEncoder(
            Schema.Struct({
              firstName: Schema.String,
              lastName: Schema.optional(Schema.NullOr(Schema.String)),
              email_address: Schema.String,
              isAccountVerified: Schema.Boolean,
              onboardingStatus: Schema.Enums(OnboardingStatus),
            }),
          ),
        )
      }).pipe(
        telemetry.withTelemetrySpan('me'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  /**
   * Logs out the currently authenticated user.
   */
  async logout(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const telemetry = yield* TelemetryService
      const authenticationService = yield* AuthenticationService

      return yield* Effect.gen(function* () {
        const result = yield* authenticationService.logout
        return yield* pipe(
          DataSource.known(result),
          UsingResponseEncoder(
            Schema.Struct({
              session: Schema.Boolean,
              token: Schema.Boolean,
            }),
          ),
        )
      }).pipe(
        telemetry.withTelemetrySpan('logout'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  /**
   * Handles user registration.
   *
   * This method creates a new user account and sends a verification email.
   * The verification email logic is handled in the controller to separate
   * concerns between user creation and email notification.
   */
  async registerUser(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService
      const masking = yield* MaskingService

      const accountVerificationService = yield* AccountVerificationService
      const authenticationService = yield* AuthenticationService

      return yield* Effect.gen(function* () {
        /**
         * Create the user using the authentication service
         */
        const user = yield* pipe(
          RegisterUserPayload.fromRequest(),
          Effect.flatMap(authenticationService.registerUser),
        )

        /**
         * Queue verification email for the newly created user
         * This is handled in the controller to separate concerns
         */
        const verificationJob = yield* pipe(
          DataSource.known({
            user: {
              identifier: UserIdentifier.make(user.uid),
              email_address: user.email!,
            },
            duration: Duration.hours(1),
          }),
          QueueVerificationEmailPayload.fromSource(),
          Effect.flatMap(accountVerificationService.queueVerificationEmail),
        )

        /**
         * Annotate response metadata with user and job information
         */
        yield* responseContext.annotateMetadata({
          user_id: user.uid,
          job_id: verificationJob.id,
        })

        /**
         * Mask the email address for security in the response message
         */
        const maskedEmailAddress = yield* masking.maskEmail(user.email!)

        /**
         * Return the registration response with user information and success message
         */
        return yield* pipe(
          DataSource.known({
            message: `Registration successful! We've sent a verification email to ${maskedEmailAddress}. Please check your email and click the verification link to activate your account.`,
            user: {
              uid: user.uid,
              firstName: user.firstName,
              lastName: user.lastName,
              emailAddress: user.email!,
              isAccountVerified: user.isAccountVerified,
              onboardingStatus: user.onboardingStatus,
            },
          }),
          UsingResponseEncoder(
            Schema.Struct({
              message: Schema.String,
              user: Schema.Struct({
                uid: Schema.String,
                firstName: Schema.String,
                lastName: Schema.optional(Schema.NullOr(Schema.String)),
                emailAddress: Schema.String,
                isAccountVerified: Schema.Boolean,
                onboardingStatus: Schema.Enums(OnboardingStatus),
              }),
            }),
          ),
        )
      }).pipe(
        telemetry.withTelemetrySpan('register_user'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }
}
