import type { InferInternalErrorSchema, InternalErrorOptions } from '#core/error/factories/internal_error'
import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import ErrorCauseService from '#core/error/services/error_cause_service'
import { defu } from 'defu'
import { Effect, pipe, Schema } from 'effect'

/**
 * Error occurs when there is a error while dispatching a job to the queue.
 *
 * @category Internal Error
 */
export default class QueueJobDispatchError extends InternalError('queue_job_dispatch')({
  code: InternalErrorCode.I_QUEUE_JOB_DISPATCH,
  schema: Schema.Struct({
    id: Schema.String,
    job: Schema.String,
    payload: Schema.optional(Schema.Unknown),
  }),
}) {
  /**
   * Creates a new `QueueJobDispatchError` instance based on the unknown error
   * as the root cause of the error.
   *
   * @param data - The data that caused the error.
   * @param message - A human-readable message for the error.
   * @param options - Additional options for the error.
   */
  static fromUnknownError(data: Schema.Schema.Encoded<InferInternalErrorSchema<QueueJobDispatchError>>, message?: string, options?: Omit<InternalErrorOptions, 'cause'>) {
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
            cause => new QueueJobDispatchError(
              { data },
              message,
              defu(options, { cause }),
            ),
            Effect.catchTag('@error/internal/queue_job_dispatch', Effect.succeed),
          )
        }),
        Effect.provide(ErrorCauseService.Default),
      ),
    )
  }
}
