import type { InternalErrorOptions } from '#core/error/factories/internal_error'
import type { EffectWithoutParseError } from '#core/schema/types/literals'
import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import { defu } from 'defu'
import { Effect, ParseResult, Schema } from 'effect'
import { merge } from 'lodash-es'

/**
 * Error occurs when there is a parse error while parsing or stringifying
 * data using a schema in the application.
 *
 * @category Internal Error
 */
export default class SchemaError extends InternalError('schema')({
  code: InternalErrorCode.I_SCHEMA,
  schema: Schema.Struct({
    issue: Schema.String,
    data: Schema.optional(Schema.Unknown),
  }),
}) {
  readonly [ParseResult.ParseErrorTypeId] = ParseResult.ParseErrorTypeId

  /**
   * The actual parse issue that occurred during encoding
   * or decoding of the data using the schema.
   */
  readonly issue: ParseResult.ParseIssue

  constructor(error: ParseResult.ParseError, data?: unknown, message?: string, options?: Omit<InternalErrorOptions, 'cause'>) {
    super({ data: { issue: '', data } }, message, defu(options, { cause: error }))
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
   * Converts the `ParseResult.ParseError` to a `SchemaError` in
   * the effect pipeline if the error is a `ParseResult.ParseError`.
   *
   * @param message - A human-readable message for the error.
   * @param data - Data that was being parsed when the error occurred.
   */
  static fromParseError(message?: string, data?: unknown) {
    /**
     * @param effect - The effect in which error conversion is to be applied.
     */
    return <A, E, R>(effect: Extract<E, ParseResult.ParseError> extends never ? EffectWithoutParseError : Effect.Effect<A, E, R>) => {
      return effect.pipe(
        Effect.catchIf(
          error => ParseResult.isParseError(error),
          error => new SchemaError(error, data, message),
        ),
      )
    }
  }
}
