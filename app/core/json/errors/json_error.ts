import type { InferInternalErrorSchema, InternalErrorOptions } from '#core/error/factories/internal_error'
import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import ErrorCauseService from '#core/error/services/error_cause_service'
import { defu } from 'defu'
import { Effect, pipe, Schema } from 'effect'

export default class JsonError extends InternalError('json')({
  code: InternalErrorCode.I_JSON,
  schema: Schema.Struct({
    on: Schema.Literal('parse', 'stringify'),
    data: Schema.optional(Schema.Unknown),
  }),
}) {
  /**
   * Create a JSON error from an unknown error.
   *
   * @param on - The operation that caused the error.
   * @param data - The data that was being processed.
   * @param message - An optional error message.
   * @param options - Additional options for the error.
   * @returns A function that takes an error and returns a JSON error.
   */
  static fromUnknownError(on: Schema.Schema.Encoded<InferInternalErrorSchema<JsonError>>['on'], data?: unknown, message?: string, options?: Omit<InternalErrorOptions, 'cause'>) {
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
