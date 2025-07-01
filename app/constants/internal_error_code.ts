import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const INTERNAL_ERROR_CODE = Enum({
  I_UNKNOWN: 'I_UNKNOWN',
  I_SCHEMA: 'I_SCHEMA',
  I_JSON: 'I_JSON',

  I_LUCID_COLUMN_VALUE: 'I_LUCID_COLUMN_VALUE',
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
  [InternalErrorCode.I_LUCID_COLUMN_VALUE]: {
    message: 'Unexpected error occurred while consuming or preparing a value for a Lucid column.',
  },
}
