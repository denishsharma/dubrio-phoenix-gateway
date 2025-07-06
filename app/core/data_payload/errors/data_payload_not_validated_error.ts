import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import { Schema } from 'effect'

/**
 * Error occurs when the payload data is received but has not been validated yet.
 *
 * @category Internal Error
 */
export default class DataPayloadNotValidatedError extends InternalError('data_payload_not_validated')({
  code: InternalErrorCode.I_DATA_PAYLOAD_NOT_VALIDATED,
  schema: Schema.Struct({
    payload: Schema.optional(Schema.String),
  }),
}) {}
