import type { LUCID_COLUMN_MARKER } from '#core/lucid/constants/lucid_marker'
import type { BaseColumnOptions } from '#core/lucid/types/column'
import type { LucidRow } from '@adonisjs/lucid/types/model'
import type { Brand } from 'effect'
import type { EmptyObject } from 'type-fest'
import { merge } from 'lodash-es'

/**
 * The options for the `consume` function that is invoked
 * when the row is being fetched from the database.
 */
interface LucidColumnConsumeOptions<T extends string, I, O extends BaseColumnOptions<any>, L extends object | void> {
  /**
   * The options for the column that are passed to the
   * constructor function.
   *
   * The value returned from the constructor function is
   * merged with the options provided to the column.
   */
  options: O & (L extends object ? L : EmptyObject) & { tag: T };

  /**
   * The value of the column that is being consumed
   * from the database.
   */
  value: I;

  /**
   * The attribute name of the column.
   */
  attribute: string;

  /**
   * The model instance that is being consumed.
   */
  model: LucidRow;
}

/**
 * The options for the `prepare` function that is invoked
 * when the row is being prepared for the database.
 */
interface LucidColumnPrepareOptions<T extends string, A, O extends BaseColumnOptions<any>, L extends object | void> {
  /**
   * The options for the column that are passed to the
   * constructor function.
   *
   * The value returned from the constructor function is
   * merged with the options provided to the column.
   */
  options: O & (L extends object ? L : EmptyObject) & { tag: T };

  /**
   * The value of the column that is being prepared
   * for the database.
   */
  value: A;

  /**
   * The attribute name of the column.
   */
  attribute: string;

  /**
   * The model instance that is being prepared.
   */
  model: LucidRow;
}

/**
 * The function that is invoked when the row is being
 * fetched from the database.
 */
type LucidColumnConsumeFunction<T extends string, A, I, O extends BaseColumnOptions<any>, L extends object | void> = (options: LucidColumnConsumeOptions<T, I, O, L>) => A

/**
 * The function that is invoked when the row is being
 * prepared for the database.
 */
type LucidColumnPrepareFunction<T extends string, A, I, O extends BaseColumnOptions<any>, L extends object | void> = (options: LucidColumnPrepareOptions<T, A, O, L>) => I

/**
 * The options for the lucid column factory function
 * that is used to return a column decorator function.
 */
interface LucidColumnFactoryOptions<T extends string, A, I, O extends BaseColumnOptions<any>, L extends object | void> {
  /**
   * Options for the column.
   */
  options: O;

  /**
   * The constructor function for the column that
   * is invoked initially before everything else.
   *
   * This function is invoked with the options provided
   * to the column and can return a value that is used
   * to resolve the column value.
   */
  constructor: (options: O & { tag: T }) => L;

  /**
   * Invoked when the row is being fetched from
   * the database.
   */
  consume?: LucidColumnConsumeFunction<T, A, I, O, L>;

  /**
   * Invoked before create or update operations
   * happening on the model.
   */
  prepare?: LucidColumnPrepareFunction<T, A, I, O, L>;
}

/**
 * The lucid column factory function that is used to
 * create a column decorator function.
 */
export type LucidColumn<
  T extends string,
  A = unknown,
  I = unknown,
  O extends BaseColumnOptions<any> = BaseColumnOptions<any>,
  L extends object | void = void,
> = Brand.Branded<{
  _tag: T;
  unresolvedOptions: O & { tag: T };
  constructor: (options: O & { tag: T }) => L;
  consume: LucidColumnConsumeFunction<T, A, I, O, L> | undefined;
  prepare: LucidColumnPrepareFunction<T, A, I, O, L> | undefined;
  toString: () => string;
  toJSON: () => { _tag: T; options: O };
}, typeof LUCID_COLUMN_MARKER>

/**
 * Factory function to create a lucid column decorator
 * with the unique tag for telemetry and debugging purposes.
 *
 * Tag is prefixed with `@lucid_column/` to avoid conflicts
 * with other tags in the application.
 *
 * @param tag - The unique tag for the column.
 */
export function LucidColumn<T extends string>(tag: T) {
  type RT = `@lucid_column/${T}`
  const resolvedTag = `@lucid_column/${tag}` as RT

  /**
   * @template A - The type of the column value that is being consumed in the application.
   * @template I - The type of the column value that is being stored in the database.
   */
  return <A = unknown, I = unknown>() => {
    /**
     * @param factoryOptions - The options for the column factory function.
     */
    return <O extends BaseColumnOptions<any> = BaseColumnOptions<any>, L extends object | void = void>(factoryOptions: LucidColumnFactoryOptions<RT, A, I, O, L>) => {
      const { options, constructor, consume, prepare } = factoryOptions

      const Factory = {
        _tag: resolvedTag,
        unresolvedOptions: merge(options, { tag: resolvedTag }),
        constructor,
        consume,
        prepare,
        toString: () => `LucidColumn<${resolvedTag}>`,
        toJSON: () => {
          return {
            _tag: resolvedTag,
            options,
          }
        },
      }
      return Factory as LucidColumn<RT, A, I, O, L>
    }
  }
}
