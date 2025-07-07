import is from '@adonisjs/core/helpers/is'
import stringHelpers from '@adonisjs/core/helpers/string'
import { Effect } from 'effect'

export default class ObjectUtilityService extends Effect.Service<ObjectUtilityService>()('@service/shared/common/object_utility', {
  effect: Effect.gen(function* () {
    function renameKeysWithMapper<T>(obj: T, mapper: (key: string) => string = stringHelpers.snakeCase): T {
      if (!is.object(obj) || is.nullOrUndefined(obj) || is.function(obj) || is.class(obj)) {
        return obj
      }

      if (is.array(obj)) {
        return obj.map(item => renameKeysWithMapper(item as T, mapper)) as T
      }

      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => {
          const newKey = mapper(key)
          return [newKey, renameKeysWithMapper(value, mapper)]
        }),
      ) as T
    }

    return {
      /**
       * Recursively renames object keys using a provided key-mapping function.
       *
       * @param obj - The object to rename keys for.
       * @param mapper - The function to use to rename keys (default: snakeCase).
       *
       * @example
       * ```ts
       * import stringHelpers from '@adonisjs/core/helpers/string'
       *
       * const obj = {
       *   userName: "JohnDoe",
       *   userDetails: {
       *     firstName: "John",
       *     lastName: "Doe",
       *     userAge: 25
       *   }
       * };
       *
       * const result = renameKeysWithMapper(obj, stringHelpers.snakeCase);
       * console.log(result);
       * // Output:
       * // {
       * //   user_name: "JohnDoe",
       * //   user_details: {
       * //     first_name: "John",
       * //     last_name: "Doe",
       * //     user_age: 25
       * //   }
       * // }
       * ```
       */
      renameKeysWithMapper,
    }
  }),
}) {}
