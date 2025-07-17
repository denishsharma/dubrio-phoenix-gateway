import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseService from '#core/database/services/database_service'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import { WithEmptyResponseData } from '#core/http/constants/with_empty_response_data'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import AccountAlreadyVerifiedException from '#modules/iam/exceptions/account_already_verified_exception'
import VerifyAccountRequestPayload from '#modules/iam/payloads/requests/account/verify_account_request_payload'
import AccountVerificationService from '#modules/iam/services/account_verification_service'
import AuthenticationService from '#modules/iam/services/authentication_service'
import { Effect, pipe } from 'effect'

export default class AccountController {
  private telemetryScope = 'account-controller'

  /**
   * Verifies the account of the authenticated user.
   *
   * This method checks if the user is authenticated and if the account is already verified.
   *   - If the user is authenticated and the account is verified, it throws an `AccountAlreadyVerifiedException`.
   *   - If the user is not authenticated, it allows the verification process to continue.
   *
   * If the user is authenticated or the verification process is initiated,
   * it attempts to verify the account using the data from the request.
   *
   * On successful verification, it updates the response context to indicate that the account has been verified successfully.
   */
  async verifyAccount(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService
      const accountVerificationService = yield* AccountVerificationService

      return yield* Effect.gen(function* () {
        /**
         * If user is already authenticated, we need to check if the
         * account is already verified or not and if it is, we need to
         * throw an exception to indicate that the account is already verified.
         */
        yield* pipe(
          authenticationService.getAuthenticatedUser,
          Effect.tap(
            value => Effect.if(value.isAccountVerified, {
              onTrue: () => new AccountAlreadyVerifiedException('Account with given email address is already verified.'),
              onFalse: () => Effect.void,
            }),
          ),

          /**
           * If the user is not authenticated, we catch the unauthorized exception
           * and return void to allow the verification process to continue.
           *
           * This is necessary because the verification process can be initiated
           * without an authenticated user, for example, when a user clicks on a
           * verification link in an email.
           */
          Effect.catchTag('@error/exception/unauthorized', () => Effect.void),
          Effect.asVoid,
        )

        /**
         * If the user is authenticated, we proceed to verify the account.
         * If the user is not authenticated, we still proceed to verify the account
         * using the data from the request.
         */
        yield* pipe(
          VerifyAccountRequestPayload.fromRequest(),
          Effect.flatMap(payload => accountVerificationService.verifyAccount(payload.token)),
        )

        /**
         * If the verification is successful, we update the response context
         * to indicate that the account has been verified successfully.
         */
        yield* responseContext.setMessage('Your account has been verified successfully. You can now log in to your account.')

        /**
         * If the verification is successful, we update the response context
         * to indicate that the account has been verified successfully.
         */
        return WithEmptyResponseData()
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('verify_account'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  // TODO: Implement the method to send verification email when user is authenticated but account is not verified.
  async sendVerificationEmail(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const telemetry = yield* TelemetryService

      return yield* Effect.gen(function* () {
        // Placeholder for sending verification email logic (REMOVE THIS COMMENT WHEN IMPLEMENTED)
      }).pipe(
        telemetry.withTelemetrySpan('send_verification_email'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }
}
