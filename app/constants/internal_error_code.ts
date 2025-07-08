import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const INTERNAL_ERROR_CODE = Enum({
  I_UNKNOWN: 'I_UNKNOWN',
  I_SCHEMA: 'I_SCHEMA',
  I_JSON: 'I_JSON',
  I_NO_SUCH_ELEMENT: 'I_NO_SUCH_ELEMENT',

  I_UNEXPECTED_RUNTIME_EXIT_RESULT: 'I_UNEXPECTED_RUNTIME_EXIT_RESULT',

  I_DATABASE_TRANSACTION: 'I_DATABASE_TRANSACTION',

  I_LUCID_MODEL_RELATIONSHIP: 'I_LUCID_MODEL_RELATIONSHIP',
  I_LUCID_COLUMN_VALUE: 'I_LUCID_COLUMN_VALUE',

  I_QUEUE_JOB_DISPATCH: 'I_QUEUE_JOB_DISPATCH',
  I_QUEUE_JOB_PAYLOAD: 'I_QUEUE_JOB_PAYLOAD',

  I_HTTP_CONTEXT_UNAVAILABLE: 'I_HTTP_CONTEXT_UNAVAILABLE',

  I_DATA_PAYLOAD_NOT_VALIDATED: 'I_DATA_PAYLOAD_NOT_VALIDATED',
  I_DATA_PAYLOAD_KIND_MISMATCH: 'I_DATA_PAYLOAD_KIND_MISMATCH',
  I_DATA_PAYLOAD_INVALID_DATA_SOURCE: 'I_DATA_PAYLOAD_INVALID_DATA_SOURCE',

  I_STRING_MIXER: 'I_STRING_MIXER',
})

export type InternalErrorCode = InferValue<typeof INTERNAL_ERROR_CODE>
export const InternalErrorCode = INTERNAL_ERROR_CODE.accessor

export interface InternalErrorCodeMetadata {
  /**
   * A human-readable message describing the internal error.
   */
  message: string;
}

/**
 * A map of internal error codes to their metadata.
 */
export const INTERNAL_ERROR_CODE_METADATA: Record<InternalErrorCode, InternalErrorCodeMetadata> = {
  [InternalErrorCode.I_UNKNOWN]: {
    message: 'An unknown error that was not expected occurred and not able to be handled.',
  },
  [InternalErrorCode.I_SCHEMA]: {
    message: 'A schema parsing error occurred, indicating an issue with the provided structure.',
  },
  [InternalErrorCode.I_JSON]: {
    message: 'Unexpected error occurred while parsing JSON data.',
  },
  [InternalErrorCode.I_NO_SUCH_ELEMENT]: {
    message: 'The element that is being accessed does not exist in the data structure.',
  },
  [InternalErrorCode.I_UNEXPECTED_RUNTIME_EXIT_RESULT]: {
    message: 'Unexpected runtime exit result returned from the application runtime and not able to be handled.',
  },
  [InternalErrorCode.I_DATABASE_TRANSACTION]: {
    message: 'Unexpected error occurred while performing a database transaction.',
  },
  [InternalErrorCode.I_LUCID_MODEL_RELATIONSHIP]: {
    message: 'Unexpected error occurred while loading the relationship of a Lucid model.',
  },
  [InternalErrorCode.I_LUCID_COLUMN_VALUE]: {
    message: 'Unexpected error occurred while consuming or preparing a value for a Lucid column.',
  },
  [InternalErrorCode.I_QUEUE_JOB_DISPATCH]: {
    message: 'Unexpected error occurred while dispatching the queue job.',
  },
  [InternalErrorCode.I_QUEUE_JOB_PAYLOAD]: {
    message: 'Unexpected error occurred while handling the payload of the queue job.',
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
  [InternalErrorCode.I_STRING_MIXER]: {
    message: 'Unexpected error occurred while mixing the strings using the String Mixer service.',
  },
}
