import type { ExceptionOptions, InferExceptionSchema } from '#core/error/factories/exception'
import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import ErrorCauseService from '#core/error/services/error_cause_service'
import { defu } from 'defu'
import { Effect, pipe, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when there is an issue with workspace member operations.
 * It can be used to handle errors related to adding, removing, or updating workspace members.
 *
 * @category Exception
 */
export default class WorkspaceMemberException extends Exception('workspace_member')({
  status: StatusCodes.BAD_REQUEST,
  code: ExceptionCode.E_WORKSPACE_MEMBER,
  schema: Schema.Struct({
    operation: Schema.optional(Schema.Literal('add', 'remove', 'update')),
    reason: Schema.Literal('already_exists', 'unknown'),
    workspace_id: Schema.ULID,
    data: Schema.optional(Schema.Unknown),
  }),
}) {
  /**
   * Creates a new `WorkspaceMemberException` instance based on the unknown error
   * as the root cause of the error.
   *
   * @param data - The data that caused the error.
   * @param message - A human-readable message for the error.
   * @param options - Additional options for the error.
   */
  static fromUnknownError(data: Schema.Schema.Encoded<InferExceptionSchema<WorkspaceMemberException>>, message?: string, options?: Omit<ExceptionOptions, 'cause'>) {
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
            cause => new WorkspaceMemberException(
              { data },
              message,
              defu(options, { cause }),
            ),
            Effect.catchTag('@error/exception/workspace_member', Effect.succeed),
          )
        }),
        Effect.provide(ErrorCauseService.Default),
      ),
    )
  }
}
