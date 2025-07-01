import type { ColumnOptions } from '@adonisjs/lucid/types/model'
import type { EmptyObject } from 'type-fest'

/**
 * Base column options for Lucid columns without
 * `consume` and `prepare` methods defined.
 *
 * This is used to define the base options for where columns can be configured
 * to have transformations applied to them when they are consumed from the database
 * or prepared for the database.
 */
export type BaseColumnOptions<U extends object = EmptyObject> = Partial<Omit<ColumnOptions, 'consume' | 'prepare'>> & U
