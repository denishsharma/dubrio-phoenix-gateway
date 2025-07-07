import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const RESPONSE_DATA_MODE = Enum({
  /**
   * Response data field contains a single object.
   */
  SINGLE: 'single',

  /**
   * Response data field contains an array of objects
   * and metadata for pagination.
   */
  PAGINATED: 'paginated',

  /**
   * Response data field contains an array of objects.
   */
  LIST: 'list',

  /**
   * Response data field contains any type of data.
   *
   * This mode is used when the response data
   * is not a JSON object or array.
   */
  RAW: 'raw',

  /**
   * Response data field is empty or not present.
   */
  EMPTY: 'empty',
})

export type ResponseDataMode = InferValue<typeof RESPONSE_DATA_MODE>
export const ResponseDataMode = RESPONSE_DATA_MODE.accessor
