import type { Jsonifiable } from 'type-fest'
import JsonError from '#core/json/errors/json_error'
import { defu } from 'defu'
import { Effect } from 'effect'
import { stringify as jsonStringify } from 'safe-stable-stringify'

interface JsonErrorOptions {
  message?: string;
}

export default class JsonService extends Effect.Service<JsonService>()('@service/core/json', {

  /**
   * Service for handling JSON operations such as stringifying and parsing JSON data.
   */
  effect: Effect.gen(function* () {
    /**
     * Stringify the given data to JSON.
     *
     * @param space - The number of spaces to use for indentation.
     * @param options - Additional options for the error.
     */
    function stringify(space?: number, options?: { error?: JsonErrorOptions }) {
      const resolvedOptions = defu(options, { error: { message: 'Unexpected error occurred while stringifying JSON data.' } })
      return (data: Jsonifiable) =>
        Effect.try({
          try: () => jsonStringify(data, undefined, space),
          catch: JsonError.fromUnknownError('stringify', data, resolvedOptions.error.message),
        })
    }

    /**
     * Parse the given JSON string to an object.
     *
     * @param options - Additional options for the error.
     */
    function parse<T = unknown>(options?: { error?: JsonErrorOptions }) {
      const resolvedOptions = defu(options, { error: { message: 'Unexpected error occurred while parsing JSON data.' } })
      return (data: string) =>
        Effect.try({
          try: () => JSON.parse(data) as T,
          catch: JsonError.fromUnknownError('parse', data, resolvedOptions.error.message),
        })
    }

    return {
      /**
       * Stringify the given data to JSON.
       *
       * @param space - The number of spaces to use for indentation.
       * @param options - Additional options for the error.
       */
      stringify,

      /**
       * Parse the given JSON string to an object.
       *
       * @param options - Additional options for the error.
       */
      parse,
    }
  }),
}) {}
