import type { InferInternalErrorSchema, InternalErrorOptions } from '#core/error/factories/internal_error'
import type { EffectWithoutParseError } from '#core/schema/types/literals'
import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import { defu } from 'defu'
import { Effect, ParseResult, Schema } from 'effect'
import { merge } from 'lodash-es'

export default class QueueJobPayloadError extends InternalError('queue_job_payload')({
  code: InternalErrorCode.I_QUEUE_JOB_PAYLOAD,
  schema: Schema.Struct({
    job: Schema.String,
    mode: Schema.Literal('encode', 'decode'),
    payload: Schema.optional(Schema.Unknown),
    issue: Schema.String,
  }),
}) {
  readonly [ParseResult.ParseErrorTypeId] = ParseResult.ParseErrorTypeId

  /**
   * The actual parse issue that occurred during encoding
   * or decoding of the data using the schema.
   */
  readonly issue: ParseResult.ParseIssue

  constructor(
    error: ParseResult.ParseError,
    job: Schema.Schema.Encoded<InferInternalErrorSchema<QueueJobPayloadError>>['job'],
    mode: Schema.Schema.Encoded<InferInternalErrorSchema<QueueJobPayloadError>>['mode'],
    payload?: Schema.Schema.Encoded<InferInternalErrorSchema<QueueJobPayloadError>>['payload'],
    message?: string,
    options?: Omit<InternalErrorOptions, 'cause'>,
  ) {
    super(
      {
        data: {
          job,
          mode,
          payload,
          issue: '',
        },
      },
      message,
      defu(options, { cause: error }),
    )

    this.issue = error.issue
    this.update((draft) => {
      draft.data.issue = ParseResult.TreeFormatter.formatIssueSync(this.issue)
    })
  }

  /**
   * String representation of the schema parse error.
   * It includes the error code, message, and the formatted parse issue in the tree format.
   */
  override toString() {
    return `<${this._tag}> [${this.code}]: ${this.message}\n${ParseResult.TreeFormatter.formatIssueSync(this.issue)}`
  }

  /**
   * JSON representation of the schema parse error.
   * It includes the error code, message, and the formatted parse issue in the array format.
   */
  override toJSON() {
    return merge(super.toJSON(), {
      issue: ParseResult.ArrayFormatter.formatIssueSync(this.issue),
    })
  }

  /**
   * Converts the `ParseResult.ParseError` to a `QueueJobPayloadError` in
   * the effect pipeline if the error is a `ParseResult.ParseError`.
   *
   * @param message - A human-readable message for the error.
   * @param data - Data that was being parsed when the error occurred.
   */
  static fromParseError(
    job: Schema.Schema.Encoded<InferInternalErrorSchema<QueueJobPayloadError>>['job'],
    mode: Schema.Schema.Encoded<InferInternalErrorSchema<QueueJobPayloadError>>['mode'],
    message?: string,
    payload?: Schema.Schema.Encoded<InferInternalErrorSchema<QueueJobPayloadError>>['payload'],
  ) {
    /**
     * @param effect - The effect in which error conversion is to be applied.
     */
    return <A, E, R>(effect: Extract<E, ParseResult.ParseError> extends never ? EffectWithoutParseError : Effect.Effect<A, E, R>) => {
      return effect.pipe(
        Effect.catchIf(
          error => ParseResult.isParseError(error),
          error => new QueueJobPayloadError(error, job, mode, payload, message),
        ),
      )
    }
  }
}
