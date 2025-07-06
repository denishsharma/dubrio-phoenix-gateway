import type { InferInternalErrorSchema, InternalErrorOptions } from '#core/error/factories/internal_error'
import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import ErrorCauseService from '#core/error/services/error_cause_service'
import { defu } from 'defu'
import { Effect, pipe, Schema } from 'effect'

export default class LucidModelRelationshipError extends InternalError('lucid_model_relationship')({
  code: InternalErrorCode.I_LUCID_MODEL_RELATIONSHIP,
  schema: Schema.Struct({
    model: Schema.compose(Schema.String, Schema.Lowercase),
    relatedModel: Schema.compose(Schema.String, Schema.Lowercase),
    relationship: Schema.String,
  }),
}) {
  constructor(
    data: Schema.Schema.Encoded<InferInternalErrorSchema<LucidModelRelationshipError>>,
    message?: string,
    options?: InternalErrorOptions,
  ) {
    super({ data }, message, defu(options, { cause: undefined }))
  }

  /**
   * Creates a new `LucidModelRelationshipError` instance based on the unknown error
   * as the root cause of the error.
   *
   * @param model - The name of the model that caused the error.
   * @param relatedModel - The name of the related model that caused the error.
   * @param relationship - The name of the relationship that caused the error.
   * @param message - A human-readable message for the error.
   * @param options - Additional options for the error.
   */
  static fromUnknownError(
    model: Schema.Schema.Encoded<InferInternalErrorSchema<LucidModelRelationshipError>>['model'],
    relatedModel: Schema.Schema.Encoded<InferInternalErrorSchema<LucidModelRelationshipError>>['relatedModel'],
    relationship: Schema.Schema.Encoded<InferInternalErrorSchema<LucidModelRelationshipError>>['relationship'],
    message?: string,
    options?: Omit<InternalErrorOptions, 'cause'>,
  ) {
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
            cause => new LucidModelRelationshipError(
              { model, relatedModel, relationship },
              message,
              defu(options, { cause }),
            ),
            Effect.catchTag('@error/internal/lucid_model_relationship', Effect.succeed),
          )
        }),
        Effect.provide(ErrorCauseService.Default),
      ),
    )
  }
}
