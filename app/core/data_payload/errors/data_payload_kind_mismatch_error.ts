import { InternalErrorCode } from '#constants/internal_error_code'
import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { InternalError } from '#core/error/factories/internal_error'
import { Schema } from 'effect'

/**
 * Error occurs when the payload data kind does not match the expected kind.
 *
 * @category Internal Error
 */
export default class DataPayloadKindMismatchError extends InternalError('data_payload_kind_mismatch')({
  code: InternalErrorCode.I_DATA_PAYLOAD_KIND_MISMATCH,
  schema: Schema.Struct({
    expected: Schema.Enums(DataPayloadKind),
    actual: Schema.optional(Schema.Enums(DataPayloadKind)),
  }),
}) {}
