import type { BaseColumnOptions } from '#core/lucid/types/column'
import LucidColumnValueError from '#core/lucid/errors/lucid_column_value_error'
import { LucidColumn } from '#core/lucid/factories/lucid_column'
import is from '@adonisjs/core/helpers/is'
import { defaultTo } from 'lodash-es'

interface AcceptableEnumType { [x: string]: string }

export type EnumColumnOptions<T extends AcceptableEnumType, N extends boolean>
  = & {
    /**
     * The enum values for the column to be used in the database.
     */
    enum: T;

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
        default?: () => T[keyof T] | null;
      }
    : {
        /**
         * The default value for the column when column
         * is not nullable (required).
         */
        default: () => T[keyof T];
      }
  )

export default function EnumColumn<T extends AcceptableEnumType, N extends boolean = false>(options: () => BaseColumnOptions<EnumColumnOptions<T, N>>) {
  return LucidColumn('enum')<T[keyof T] | null | undefined, string | null | undefined>()({
    options: options(),
    constructor: (args) => {
      const [
        enumValues,
        nullable,
        resolveDefault,
      ] = [
        args.enum,
        defaultTo(args.nullable, false),
        args.default,
      ]

      if (Object.keys(enumValues).length === 0) {
        throw new LucidColumnValueError(
          { data: { reason: 'invalid_options' } },
          `LucidColumn<${args.tag}> [${args.columnName}] The enum column must have at least one value defined.`,
        )
      }

      if (!nullable && is.null(resolveDefault)) {
        throw new LucidColumnValueError(
          { data: { reason: 'required_default' } },
          `LucidColumn<${args.tag}> [${args.columnName}] The default value for the enum column is required when the column is not nullable.`,
        )
      }

      return {
        enum: enumValues,
        nullable,
        default: defaultTo(resolveDefault, () => null),
      }
    },
    consume: (args) => {
      if (is.undefined(args.value)) { return undefined }

      if (!is.string(args.value) && !is.null(args.value)) {
        throw new LucidColumnValueError(
          { data: { reason: 'invalid_consume', attribute: args.attribute, model: Object.getPrototypeOf(args.model).name, value: args.value } },
          `LucidColumn<${args.options.tag}> [${args.options.columnName}] The value for the enum column is invalid. Expected a string or null, but received ${typeof args.value}.`,
        )
      }

      return (
        args.options.nullable
          ? is.null(args.value)
            ? args.options.default()
            : Object.values(args.options.enum).includes(args.value)
              ? args.value
              : args.options.default()
          : is.null(args.value)
            ? args.options.default()
            : Object.values(args.options.enum).includes(args.value)
              ? args.value
              : args.options.default()
      ) as T[keyof T] | null
    },
    prepare: (args) => {
      if (is.undefined(args.value)) { return undefined }

      if (!is.null(args.value) && !Object.values(args.options.enum).includes(args.value)) {
        throw new LucidColumnValueError(
          { data: { reason: 'invalid_prepare', attribute: args.attribute, model: Object.getPrototypeOf(args.model).name, value: args.value } },
          `LucidColumn<${args.options.tag}> [${args.options.columnName}] The value for the enum column is invalid. Expected a valid enum value or null, but received ${typeof args.value}.`,
        )
      }

      return args.options.nullable
        ? is.null(args.value)
          ? is.null(args.options.default())
            ? null
            : args.options.default()
          : Object.values(args.options.enum).includes(args.value)
            ? args.value
            : args.options.default()
        : is.null(args.value)
          ? args.options.default()
          : Object.values(args.options.enum).includes(args.value)
            ? args.value
            : args.options.default()
    },
  })
}
