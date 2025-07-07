import type { InferInternalErrorSchema, InternalErrorOptions } from '#core/error/factories/internal_error'
import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import ErrorCauseService from '#core/error/services/error_cause_service'
import { defu } from 'defu'
import { Effect, pipe, Schema } from 'effect'

/**
 * Error occurs when there is a error while performing a database transaction.
 *
 * @category Internal Error
 */
export default class DatabaseTransactionError extends InternalError('database_transaction')({
  code: InternalErrorCode.I_DATABASE_TRANSACTION,
  schema: Schema.Struct({
    operation: Schema.Literal('create', 'commit', 'rollback', 'savepoint'),
  }),
}) {
  /**
   * Creates a new `DatabaseTransactionError` instance based on the unknown error
   * as the root cause of the error.
   *
   * @param operation - The operation that caused the error (create, commit, rollback, savepoint).
   * @param message - A human-readable message for the error.
   * @param options - Additional options for the error.
   */
  static fromUnknownError(operation: Schema.Schema.Encoded<InferInternalErrorSchema<DatabaseTransactionError>>['operation'], message?: string, options?: Omit<InternalErrorOptions, 'cause'>) {
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
            cause => new DatabaseTransactionError(
              { data: { operation } },
              message,
              defu(options, { cause }),
            ),
            Effect.catchTag('@error/internal/database_transaction', Effect.succeed),
          )
        }),
        Effect.provide(ErrorCauseService.Default),
      ),
    )
  }
}
