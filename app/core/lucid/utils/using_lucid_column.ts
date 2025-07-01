import type { LucidColumn } from '#core/lucid/factories/lucid_column'
import type { BaseColumnOptions } from '#core/lucid/types/column'
import type { ColumnOptions } from '@adonisjs/lucid/types/model'
import { column as lucidColumn } from '@adonisjs/lucid/orm'
import { defu } from 'defu'
import { defaultTo, merge, pick } from 'lodash-es'

/**
 * Decorator to use when defining a column in a Lucid model that is
 * using the Lucid ORM and custom column options.
 *
 * This returns a decorator function that can be used to define a column
 * in a Lucid model.
 *
 * @param column - The column to be used in the model.
 */
export default function UsingLucidColumn<U extends LucidColumn<any, any, any, any, any>>(column: U) {
  const resolvedOptions = merge(column.unresolvedOptions, column.constructor(column.unresolvedOptions)) as ColumnOptions

  return lucidColumn(defu(
    {
      consume(value, attribute, model) {
        const consume = defaultTo(column.consume, () => value)
        return consume({
          options: resolvedOptions,
          value,
          attribute,
          model,
        })
      },
      prepare(value, attribute, model) {
        const prepare = defaultTo(column.prepare, () => value)
        return prepare({
          options: resolvedOptions,
          value,
          attribute,
          model,
        })
      },
    } as Partial<ColumnOptions>,
    pick(resolvedOptions, [
      'columnName',
      'isPrimary',
      'meta',
      'serialize',
      'serializeAs',
    ] as (keyof BaseColumnOptions)[]),
  ))
}
