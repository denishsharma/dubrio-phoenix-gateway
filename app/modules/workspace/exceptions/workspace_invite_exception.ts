import type { ExceptionOptions } from '#core/error/factories/exception'
import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import ErrorCauseService from '#core/error/services/error_cause_service'
import { defu } from 'defu'
import { Effect, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'

export default class WorkspaceInviteException extends Exception('workspace_invite')({
  status: StatusCodes.BAD_REQUEST,
  code: ExceptionCode.E_WORKSPACE_INVITE,
}) {
  /**
   * Creates a new `WorkspaceInviteException` instance based on the unknown error
   * as the root cause of the error.
   *
   * @param message - A human-readable message for the error.
   * @param options - Additional options for the error.
   */
  static fromUnknownError(message?: string, options?: Omit<ExceptionOptions, 'cause'>) {
    /**
     * @param error - The unknown error to convert.
     */
    return (error: unknown) => Effect.runSync(
      pipe(
        Effect.gen(function* () {
          const errorCause = yield* ErrorCauseService
          return yield* pipe(
            error,
            errorCause.inferCauseFromError,
            cause => new WorkspaceInviteException(
              message,
              defu(options, { cause }),
            ),
            Effect.catchTag('@error/exception/workspace_invite', Effect.succeed),
          )
        }),
        Effect.provide(ErrorCauseService.Default),
      ),
    )
  }
}
