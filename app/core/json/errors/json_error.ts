import type { InferInternalErrorSchema, InternalErrorOptions } from '#core/error/factories/internal_error'
import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import ErrorCauseService from '#core/error/services/error_cause_service'
import { defu } from 'defu'
import { Effect, pipe, Schema } from 'effect'

/**
 * Error occurs when there is a error while parsing or stringifying JSON data.
 *
 * @category Internal Error
 */
export default class JsonError extends InternalError('json')({
  code: InternalErrorCode.I_JSON,
  schema: Schema.Struct({
    on: Schema.Literal('parse', 'stringify'),
    data: Schema.optional(Schema.Unknown),
  }),
}) {
  /**
   * Creates a new `JsonError` instance based on the unknown error
   * as the root cause of the error.
   *
   * @param on - The operation that caused the error (parse or stringify).
   * @param data - The data that caused the error.
   * @param message - A human-readable message for the error.
   * @param options - Additional options for the error.
   */
  static fromUnknownError(on: Schema.Schema.Encoded<InferInternalErrorSchema<JsonError>>['on'], data?: unknown, message?: string, options?: Omit<InternalErrorOptions, 'cause'>) {
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
            cause => new JsonError(
              { data: { on, data } },
              message,
              defu(options, { cause }),
            ),
            Effect.catchTag('@error/internal/json', Effect.succeed),
          )
        }),
        Effect.provide(ErrorCauseService.Default),
      ),
    )
  }
}
