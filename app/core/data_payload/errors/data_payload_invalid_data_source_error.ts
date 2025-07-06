import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'

/**
 * Error occurs when the data source provided to the data payload is invalid
 * and cannot be processed.
 *
 * @category Internal Error
 */
export default class DataPayloadInvalidDataSourceError extends InternalError('data_payload_invalid_data_source')({
  code: InternalErrorCode.I_DATA_PAYLOAD_INVALID_DATA_SOURCE,
}) {}
