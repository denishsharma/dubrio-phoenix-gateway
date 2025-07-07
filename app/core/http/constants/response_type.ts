import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const RESPONSE_TYPE = Enum({
  /**
   * The request was successful and the response does not contain
   * any exception details by may contain response data.
   */
  SUCCESS: 'success',

  /**
   * An exception occurred while processing the request and the response
   * contains exception details.
   */
  EXCEPTION: 'exception',
})

export type ResponseType = InferValue<typeof RESPONSE_TYPE>
export const ResponseType = RESPONSE_TYPE.accessor
