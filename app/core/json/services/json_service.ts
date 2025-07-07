import type { Jsonifiable } from 'type-fest'
import JsonError from '#core/json/errors/json_error'
import { defu } from 'defu'
import { Effect } from 'effect'
import { stringify as jsonStringify } from 'safe-stable-stringify'

/**
 * The options to customize the JSON error.
 */
interface JsonErrorOptions {
  message?: string;
}

export default class JsonService extends Effect.Service<JsonService>()('@service/core/json', {
  effect: Effect.gen(function* () {
    function stringify(space?: number, options?: { error?: JsonErrorOptions }) {
      const resolvedOptions = defu(options, { error: { message: 'Unexpected error occurred while stringifying JSON data.' } })
      return (data: Jsonifiable) =>
        Effect.try({
          try: () => jsonStringify(data, undefined, space),
          catch: JsonError.fromUnknownError('stringify', data, resolvedOptions.error.message),
        })
    }

    function parse<T = unknown>(options?: { error?: JsonErrorOptions }) {
      const resolvedOptions = defu(options, { error: { message: 'Unexpected error occurred while parsing JSON data.' } })
      return (data: string) =>
        Effect.try({
          try: () => JSON.parse(data) as T,
          catch: JsonError.fromUnknownError('parse', data, resolvedOptions.error.message),
        })
    }

    function isJsonifiable(data: unknown): data is Jsonifiable {
      try {
        JSON.stringify(data)
        return true
      } catch {
        return false
      }
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

      /**
       * Check if the given data is JSON-serializable.
       *
       * This checks if the data can be safely stringified
       * without throwing an error.
       *
       * @param data - The data to check.
       */
      isJsonifiable,
    }
  }),
}) {}
