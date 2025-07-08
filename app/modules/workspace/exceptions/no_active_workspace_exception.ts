import type { ExceptionOptions } from '#core/error/factories/exception'
import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import ErrorCauseService from '#core/error/services/error_cause_service'
import { defu } from 'defu'
import { Effect, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when there is no active workspace set in the session.
 *
 * @category Exception
 */
export default class NoActiveWorkspaceException extends Exception('no_active_workspace')({
  status: StatusCodes.FORBIDDEN,
  code: ExceptionCode.E_NO_ACTIVE_WORKSPACE,
}) {
  /**
   * Creates a new `NoActiveWorkspaceException` instance based on the unknown error
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
            cause => new NoActiveWorkspaceException(
              message,
              defu(options, { cause }),
            ),
            Effect.catchTag('@error/exception/no_active_workspace', Effect.succeed),
          )
        }),
        Effect.provide(ErrorCauseService.Default),
      ),
    )
  }
}
