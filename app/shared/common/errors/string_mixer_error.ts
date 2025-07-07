import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import { Schema } from 'effect'

/**
 * Error occurs when there is an error while encoding or decoding a string
 * using the string mixer service.
 *
 * @category Internal Error
 */
export default class StringMixerError extends InternalError('string_mixer')({
  code: InternalErrorCode.I_STRING_MIXER,
  schema: Schema.Union(
    Schema.Struct({
      mode: Schema.Literal('decode'),
      value: Schema.optional(Schema.String),
      key: Schema.optional(Schema.String),
    }),
    Schema.Struct({
      mode: Schema.Literal('encode'),
      values: Schema.optional(Schema.Array(Schema.String)),
    }),
  ),
}) {}
