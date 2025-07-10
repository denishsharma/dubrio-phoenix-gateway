import type User from '#models/user_model'
import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import type { SetNonNullable } from 'type-fest'
import { DataSource } from '#constants/data_source'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseService from '#core/database/services/database_service'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import { WithEmptyResponseData } from '#core/http/constants/with_empty_response_data'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import UsingResponseEncoder from '#core/http/utils/using_response_encoder'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import UnauthorizedException from '#modules/iam/exceptions/unauthorized_exception'
import QueueVerificationEmailPayload from '#modules/iam/payloads/account/queue_verification_email_payload'
import AuthenticationCredentialsPayload from '#modules/iam/payloads/authentication/authentication_credentials_payload'
import QueuePasswordResetEmailPayload from '#modules/iam/payloads/authentication/queue_password_reset_email_payload'
import RegisterUserPayload from '#modules/iam/payloads/authentication/register_user_payload'
import ResetPasswordPayload from '#modules/iam/payloads/authentication/reset_password_payload'
import SendPasswordResetEmailPayload from '#modules/iam/payloads/authentication/send_password_reset_email_payload'
import VerifyPasswordResetTokenPayload from '#modules/iam/payloads/authentication/verify_password_reset_token_payload'
import AccountVerificationService from '#modules/iam/services/account_verification_service'
import AuthenticationService from '#modules/iam/services/authentication_service'
import MaskingService from '#shared/common/services/masking_service'
import { RetrieveUserUsingColumn } from '#shared/retrieval_strategies/user_retrieval_strategy'
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

  /**
   * Sends a password reset email to the user with the provided email address.
   *
   * This method retrieves the user from the database using the provided email address,
   * queues a job to generate a password reset token, and sends a password reset email to the user.
   */
  async sendPasswordResetEmail(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const masking = yield* MaskingService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService

      return yield* Effect.gen(function* () {
        /**
         * Extract the payload from the request.
         */
        const payload = yield* SendPasswordResetEmailPayload.fromRequest()
        const maskedEmailAddress = yield* masking.maskEmail(payload.email_address)

        /**
         * Retrieve the user from the database using the provided email.
         */
        const user = yield* pipe(
          WithRetrievalStrategy(
            RetrieveUserUsingColumn,
            retrieve => retrieve('email', payload.email_address),
            {
              select: ['uid'],
              exception: {
                throw: true,
                message: `User with email '${maskedEmailAddress}' does not exist.`,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
        )

        /**
         * Queue a job to generate a password reset token
         * and send a password reset email to the user.
         */
        const job = yield* pipe(
          DataSource.known({
            user: {
              user_identifier: UserIdentifier.make(user.uid),
              email_address: payload.email_address,
            },
            duration: Duration.minutes(15),
          }),
          QueuePasswordResetEmailPayload.fromSource(),
          Effect.flatMap(authenticationService.queuePasswordResetEmail),
        )

        /**
         * Annotate the response context with job ID and user identifier.
         */
        yield* responseContext.annotateMetadata({
          job_id: job.id,
          user_id: user.uid,
        })

        yield* responseContext.setMessage(`Password reset email has been sent successfully to ${maskedEmailAddress}.`)

        /**
         * Return an empty response data to indicate that the request was successful
         * but there is no additional data to return.
         */
        return WithEmptyResponseData()
      }).pipe(
        telemetry.withTelemetrySpan('send_password_reset_email'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  /**
   * Handles password reset requests for users who have forgotten their passwords.
   *
   * This method verifies the password reset token, retrieves the user associated with the token,
   * checks if the new password is different from the previous password, and updates the user's password.
   *
   * If the token is invalid or the new password is the same as the previous password,
   * appropriate exceptions are thrown.
   */
  async resetPassword(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService

      return yield* Effect.gen(function* () {
        yield* pipe(
          ResetPasswordPayload.fromRequest(),
          Effect.flatMap(authenticationService.resetPassword),
        )

        /**
         * Set a success message in the response context
         * indicating that the password has been reset successfully.
         */
        yield* responseContext.setMessage('Password has been reset successfully. You can now log in with your new password.')

        /**
         * Return an empty response data to indicate that the request was successful
         * but there is no additional data to return.
         */
        return WithEmptyResponseData()
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('reset_password'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  /**
   * Verifies the validity of a password reset token.
   * Returns success if the token is valid, otherwise throws an exception.
   */
  async verifyPasswordResetToken(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const telemetry = yield* TelemetryService
      const authenticationService = yield* AuthenticationService

      return yield* Effect.gen(function* () {
        /**
         * Extract the payload from the request.
         */
        const payload = yield* VerifyPasswordResetTokenPayload.fromRequest()

        /**
         * Call the service to verify the token (without consuming it).
         */
        yield* authenticationService.verifyPasswordResetToken(payload.token, false)

        /**
         * Return an empty response data to indicate that the request was successful
         * but there is no additional data to return.
         */
        return WithEmptyResponseData()
      }).pipe(
        telemetry.withTelemetrySpan('verify_password_reset_token'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }
}
