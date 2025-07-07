import type { BaseColumnOptions } from '#core/lucid/types/column'
import LucidColumnValueError from '#core/lucid/errors/lucid_column_value_error'
import { LucidColumn } from '#core/lucid/factories/lucid_column'
import is from '@adonisjs/core/helpers/is'
import { defaultTo } from 'lodash-es'

export type BooleanColumnOptions<N extends boolean>
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
        default?: () => boolean | null;
      }
    : {
        /**
         * The default value for the column when column
         * is not nullable (required).
         */
        default: () => boolean;
      }
  )

export default function BooleanColumn<N extends boolean = false>(options: () => BaseColumnOptions<BooleanColumnOptions<N>>) {
  return LucidColumn('boolean')<boolean | null | undefined, number | null | undefined>()({
    options: options(),
    constructor: (args) => {
      const [nullable, resolveDefault] = [defaultTo(args.nullable, false), args.default]

      if (!nullable && is.null(resolveDefault)) {
        throw new LucidColumnValueError(
          { data: { reason: 'required_default' } },
          `LucidColumn<${args.tag}> [${args.columnName}] The default value for the boolean column is required when the column is not nullable.`,
        )
      }

      return {
        nullable,
        default: defaultTo(resolveDefault, () => null),
      }
    },
    consume: (args) => {
      if (is.undefined(args.value)) { return undefined }

      if (!is.number(args.value) && !is.null(args.value)) {
        throw new LucidColumnValueError(
          { data: { reason: 'invalid_consume', attribute: args.attribute, model: Object.getPrototypeOf(args.model).name, value: args.value } },
          `LucidColumn<${args.options.tag}> [${args.options.columnName}] The value for the boolean column is invalid. Expected a number or null, but received ${typeof args.value}.`,
        )
      }

      return is.null(args.value)
        ? args.options.default()
        : args.value === 1
    },
    prepare: (args) => {
      if (is.undefined(args.value)) { return undefined }

      if (!is.boolean(args.value) && !is.null(args.value)) {
        throw new LucidColumnValueError(
          { data: { reason: 'invalid_prepare', attribute: args.attribute, model: Object.getPrototypeOf(args.model).name, value: args.value } },
          `LucidColumn<${args.options.tag}> [${args.options.columnName}] The value for the boolean column is invalid. Expected a boolean or null, but received ${typeof args.value}.`,
        )
      }

      return args.options.nullable
        ? is.null(args.value)
          ? is.null(args.options.default())
            ? null
            : args.options.default()
              ? 1
              : 0
          : args.value
            ? 1
            : 0
        : is.null(args.value)
          ? args.options.default()
            ? 1
            : 0
          : args.value
            ? 1
            : 0
    },
  })
}
