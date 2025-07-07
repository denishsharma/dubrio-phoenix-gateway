import type { BaseColumnOptions } from '#core/lucid/types/column'
import type { Jsonifiable } from 'type-fest'
import JsonService from '#core/json/services/json_service'
import LucidColumnValueError from '#core/lucid/errors/lucid_column_value_error'
import { LucidColumn } from '#core/lucid/factories/lucid_column'
import is from '@adonisjs/core/helpers/is'
import { Effect, Inspectable, pipe } from 'effect'
import { defaultTo } from 'lodash-es'

export type JsonColumnOptions<N extends boolean>
  = & {
    /**
     * Whether the column is nullable or not.
     *
     * @default false
     */
    nullable?: N;
  }
  & (N extends true
    ? {
        /**
         * The default value for the column when column
         * is nullable.
         *
         * @default null
         */
        default?: () => Jsonifiable | null;
      }
    : {
        /**
         * The default value for the column when column
         * is not nullable (required).
         */
        default: () => Jsonifiable;
      }
  )

export default function JsonColumn<N extends boolean = false>(options: () => BaseColumnOptions<JsonColumnOptions<N>>) {
  return LucidColumn('json')<Jsonifiable | null | undefined, string | null | undefined>()({
    options: options(),
    constructor: (args) => {
      const [nullable, resolveDefault] = [defaultTo(args.nullable, false), args.default]

      if (!nullable && is.null(resolveDefault)) {
        throw new LucidColumnValueError(
          { data: { reason: 'required_default' } },
          `LucidColumn<${args.tag}> The default value for the json column is required when the column is not nullable.`,
        )
      }

      return {
        nullable,
        default: defaultTo(resolveDefault, () => null),
      }
    },
    consume: args => Effect.runSync(pipe(
      Effect.gen(function* () {
        const json = yield* JsonService

        if (is.undefined(args.value)) { return undefined }

        return is.null(args.value)
          ? args.options.default()
          : is.string(args.value)
            ? yield* json.parse<Jsonifiable>()(args.value).pipe(
              Effect.catchTag('@error/internal/json', error => new LucidColumnValueError(
                { data: { reason: 'invalid_consume', attribute: args.attribute, model: Object.getPrototypeOf(args.model).name, value: args.value } },
                `LucidColumn<${args.options.tag}> [${args.options.columnName}] The value for the json column is invalid. Expected a jsonifiable string or null, but received ${typeof args.value}.`,
                { cause: defaultTo(error.cause, error) },
              )),
            )
            : json.isJsonifiable(args.value)
              ? args.value
              : yield* new LucidColumnValueError(
                { data: { reason: 'invalid_consume', attribute: args.attribute, model: Object.getPrototypeOf(args.model).name, value: args.value } },
                `LucidColumn<${args.options.tag}> [${args.options.columnName}] The value for the json column is invalid. Expected a jsonifiable string or null, but received ${typeof args.value}.`,
              )
      }),
      Effect.provide(JsonService.Default),
    )),
    prepare: args => Effect.runSync(pipe(
      Effect.gen(function* () {
        const json = yield* JsonService

        if (is.undefined(args.value)) { return undefined }

        if (!is.null(args.value) && !json.isJsonifiable(args.value)) {
          return yield* new LucidColumnValueError(
            { data: { reason: 'invalid_prepare', attribute: args.attribute, model: Object.getPrototypeOf(args.model).name, value: args.value } },
            `LucidColumn<${args.options.tag}> [${args.options.columnName}] The value for the json column is invalid. Expected a jsonifiable plain object or null, but received ${typeof args.value}.`,
          )
        }

        return yield* json.stringify()(Inspectable.toJSON(args.value) as Jsonifiable).pipe(
          Effect.catchTag('@error/internal/json', error => new LucidColumnValueError(
            { data: { reason: 'invalid_prepare', attribute: args.attribute, model: Object.getPrototypeOf(args.model).name, value: args.value } },
            `LucidColumn<${args.options.tag}> [${args.options.columnName}] The value for the json column is invalid. Expected a jsonifiable plain object or null, but received ${typeof args.value}.`,
            { cause: defaultTo(error.cause, error) },
          )),
        )
      }),
      Effect.provide(JsonService.Default),
    )),
  })
}
