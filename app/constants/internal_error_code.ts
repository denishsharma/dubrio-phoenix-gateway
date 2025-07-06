import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const INTERNAL_ERROR_CODE = Enum({
  I_UNKNOWN: 'I_UNKNOWN',
  I_SCHEMA: 'I_SCHEMA',
  I_JSON: 'I_JSON',

  I_LUCID_MODEL_RELATIONSHIP: 'I_LUCID_MODEL_RELATIONSHIP',
  I_LUCID_COLUMN_VALUE: 'I_LUCID_COLUMN_VALUE',

  I_HTTP_CONTEXT_UNAVAILABLE: 'I_HTTP_CONTEXT_UNAVAILABLE',

  I_DATA_PAYLOAD_NOT_VALIDATED: 'I_DATA_PAYLOAD_NOT_VALIDATED',
  I_DATA_PAYLOAD_KIND_MISMATCH: 'I_DATA_PAYLOAD_KIND_MISMATCH',
  I_DATA_PAYLOAD_INVALID_DATA_SOURCE: 'I_DATA_PAYLOAD_INVALID_DATA_SOURCE',

})

//* *
// Internal error codes that are used to identify specific internal errors.
// These codes are used for logging and debugging purposes.
// They are not meant to be exposed to the end user.
// Each code should be unique and descriptive enough to identify the error.
// */
export type InternalErrorCode = InferValue<typeof INTERNAL_ERROR_CODE>
export const InternalErrorCode = INTERNAL_ERROR_CODE.accessor

export interface InternalErrorCodeMetadata {
  /**
   * A human-readable message describing the internal error.
   */
  message: string;
}

export const INTERNAL_ERROR_CODE_METADATA: Record<InternalErrorCode, InternalErrorCodeMetadata> = {
  [InternalErrorCode.I_SCHEMA]: {
    message: 'A schema parsing error occurred, indicating an issue with the provided structure.',
  },
  [InternalErrorCode.I_JSON]: {
    message: 'Unexpected error occurred while parsing JSON data.',
  },
  [InternalErrorCode.I_UNKNOWN]: {
    message: 'An unknown error that was not expected occurred and not able to be handled.',
  },
  [InternalErrorCode.I_LUCID_MODEL_RELATIONSHIP]: {
    message: 'Unexpected error occurred while loading the relationship of a Lucid model.',
  },
  [InternalErrorCode.I_LUCID_COLUMN_VALUE]: {
    message: 'Unexpected error occurred while consuming or preparing a value for a Lucid column.',
  },
  [InternalErrorCode.I_HTTP_CONTEXT_UNAVAILABLE]: {
    message: 'The HTTP context is not available in the current scope of execution.',
  },
  [InternalErrorCode.I_DATA_PAYLOAD_NOT_VALIDATED]: {
    message: 'You have requested data from a payload that has not been validated yet. Please validate the payload before accessing the data.',
  },
  [InternalErrorCode.I_DATA_PAYLOAD_KIND_MISMATCH]: {
    message: 'The data payload kind does not match the expected kind and cannot be processed.',
  },
  [InternalErrorCode.I_DATA_PAYLOAD_INVALID_DATA_SOURCE]: {
    message: 'The data source provided to the data payload is invalid and cannot be processed.',
  },
}
