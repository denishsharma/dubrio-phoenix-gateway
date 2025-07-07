import type { Brand } from 'effect'
import is from '@adonisjs/core/helpers/is'
import { Option } from 'effect'
import { has } from 'lodash-es'

/**
 * A unique symbol used to mark the `WithEmptyResponseData` type.
 *
 * This symbol is used to differentiate the type from other types
 * and to ensure that it is treated as a special case in type checking.
 */
export const WITH_EMPTY_RESPONSE_DATA_MARKER: unique symbol = Symbol('@marker/core/http/with_empty_response_data')

/**
 * WithEmptyResponseData is a type that represents a response
 * that has no data, indicating that the response is intentionally empty.
 *
 * It is used to signal that the response does not contain any
 * meaningful data, and it is not an error or an exception.
 */
export type WithEmptyResponseData = Brand.Branded<Option.None<never>, typeof WITH_EMPTY_RESPONSE_DATA_MARKER>

/**
 * Helper function to mark a value as `WithEmptyResponseData`.
 *
 * This function adds a unique property to the value to mark it as
 * `WithEmptyResponseData`, allowing for type checking later.
 */
function markWithEmptyResponseData(withEmptyResponseData: WithEmptyResponseData) {
  if (has(withEmptyResponseData, WITH_EMPTY_RESPONSE_DATA_MARKER)) {
    // If the value already has the marker, return it as is.
    return withEmptyResponseData
  }

  return Object.defineProperty(withEmptyResponseData, WITH_EMPTY_RESPONSE_DATA_MARKER, {
    get() { return WITH_EMPTY_RESPONSE_DATA_MARKER },
  }) as WithEmptyResponseData
}

/**
 * WithEmptyResponseData is a special function returns a object that represents
 * a response with no data, indicating that the response is intentionally empty.
 *
 * It is used to signal that the response does not contain any
 * meaningful data, and it is not an error or an exception.
 *
 * Use this when you want to indicate that a response is intentionally empty,
 * but need all the metadata to be preserved.
 */
export const WithEmptyResponseData: {
  /**
   * Returns a `WithEmptyResponseData` object.
   */
  (): WithEmptyResponseData;

  /**
   * A type guard to check if a value is of type `WithEmptyResponseData`.
   *
   * @param value - The value to check.
   */
  $isWithEmptyResponseData: (value: unknown) => value is WithEmptyResponseData;

  /**
   * Converts the `WithEmptyResponseData` to a JSON representation.
   */
  toJSON: () => WithEmptyResponseData;
} = Object.assign(
  () => markWithEmptyResponseData(Option.none<undefined>() as WithEmptyResponseData),
  {
    $isWithEmptyResponseData: (value: unknown): value is WithEmptyResponseData => {
      return is.object(value)
        && has(value, WITH_EMPTY_RESPONSE_DATA_MARKER)
        && value[WITH_EMPTY_RESPONSE_DATA_MARKER] === WITH_EMPTY_RESPONSE_DATA_MARKER
    },
    toJSON: () => markWithEmptyResponseData(Option.none<undefined>() as WithEmptyResponseData),
  },
)
