import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception for contact attribute domain errors (validation and business rules).
 * Use `reason` to provide a machine-readable code and optional `details` for context.
 */
export default class ContactAttributeException extends Exception('contact_attribute')({
  status: StatusCodes.BAD_REQUEST,
  code: ExceptionCode.E_VALIDATION,
  schema: Schema.Struct({
    reason: Schema.Literal(
      'options_required',
      'options_not_allowed',
      'duplicate_option_value',
      'slug_clash',
      'invalid_data_type',
    ),
    details: Schema.optional(Schema.Struct({
      field: Schema.optional(Schema.String),
      value: Schema.optional(Schema.String),
    })),
  }),
}) {}
