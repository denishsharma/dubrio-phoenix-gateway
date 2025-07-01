import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import { Schema } from 'effect'

export default class LucidColumnValueError extends InternalError('lucid_column_value')({
  code: InternalErrorCode.I_LUCID_COLUMN_VALUE,
  schema: Schema.Struct({
    reason: Schema.Literal('required_default', 'invalid_consume', 'invalid_prepare', 'invalid_options'),
    attribute: Schema.optional(Schema.String),
    model: Schema.optional(Schema.String),
    value: Schema.optional(Schema.Unknown),
  }),
}) {}
