import type { InferLucidModelRetrievalStrategyFunction, InferLucidModelRetrievalStrategySelectColumns, LucidModelRetrievalStrategyClass, StrategyOptionsWithQuery, WITH_LUCID_MODEL_STRATEGY_FUNCTION_MARKER } from '#core/lucid/factories/lucid_model_retrieval_strategy'
import type { ResolveNestedFunctionReturnType } from '#types/function'
import type { Brand, Effect } from 'effect'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Array } from 'effect'
import { has, merge } from 'lodash-es'

/**
 * Unique symbol used to mark the `WithRetrievalMethod` type.
 * This symbol is used to differentiate the `WithRetrievalMethod` type from other types.
 */
export const WITH_RETRIEVAL_METHOD_MARKER: unique symbol = Symbol('@constant/wrapper/core/lucid/with_retrieval_method')

/**
 * The options for customizing the retrieval strategy.
 */
export type WithRetrievalStrategyOptions<L extends Record<string, unknown> | never, H extends boolean | undefined = undefined> = StrategyOptionsWithQuery<L> & {
  /**
   * The options for customizing the exception message that is thrown
   * when the strategy fails to retrieve the model instance.
   */
  exception?: {
    /**
     * Whether to make nullish value as exception or not.
     *
     * If set to true, the exception will be thrown when the value is nullish.
     */
    throw?: H;

    /**
     * The message to be used for the exception.
     * It can be a string or a function that takes the resource name as an argument.
     */
    message?: string | ((resource: string) => string);
  };
}

/**
 * Type representing the shape of the `WithRetrievalMethod` type used to define the structure
 * of the retrieval method that can be invoked.
 */
export type WithRetrievalStrategy<
  U extends LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>,
  M extends (retrieve: InferLucidModelRetrievalStrategyFunction<U>['retrieval']) => Brand.Branded<Effect.Effect<any, any, any>, typeof WITH_LUCID_MODEL_STRATEGY_FUNCTION_MARKER>,
  R = Brand.Brand.Unbranded<ReturnType<M>>,
  H extends boolean | undefined = undefined,
> = Brand.Branded<{
  strategy: U;
  method: (retrieve: InferLucidModelRetrievalStrategyFunction<U>['retrieval']) => R;
  options?: WithRetrievalStrategyOptions<InferLucidModelRetrievalStrategySelectColumns<U>, H>;
}, typeof WITH_RETRIEVAL_METHOD_MARKER>

/**
 * Helpers to infer the type of the `throw` option from the `WithRetrievalStrategyOptions`.
 */
type InferThrowOption<O>
  = O extends { exception?: { throw?: infer T } }
    ? T extends true ? true
      : T extends false ? false
        : undefined
    : undefined

/**
 * Helper function to mark a retrieval strategy with a unique symbol
 * to differentiate it from other types in runtime checks.
 */
function markWithRetrievalStrategy<
  U extends LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>,
  M extends (retrieve: InferLucidModelRetrievalStrategyFunction<U>['retrieval']) => Brand.Brand.Unbranded<ResolveNestedFunctionReturnType<InferLucidModelRetrievalStrategyFunction<U>['retrieval']>>,
  R = Brand.Brand.Unbranded<ReturnType<M>>,
  H extends boolean | undefined = undefined,
>(strategy: WithRetrievalStrategy<U, M, R, H>) {
  return Object.defineProperty(strategy, WITH_RETRIEVAL_METHOD_MARKER, {
    get() { return WITH_RETRIEVAL_METHOD_MARKER },
  }) as WithRetrievalStrategy<U, M, R, H>
}

/**
 * The `WithRetrievalStrategy` is a holder function that represents a retrieval method
 * of a specific function type.
 *
 * @param strategy - The strategy class that defines the retrieval method.
 * @param method - The method that will be used to retrieve the data.
 * @param options - Optional query options to be used with the retrieval method.
 */
export const WithRetrievalStrategy: {
  /**
   * The `WithRetrievalStrategy` is a holder function that represents a retrieval method
   * of a specific function type.
   *
   * @param strategy - The strategy class that defines the retrieval method.
   * @param method - The method that will be used to retrieve the data.
   */
  <
    U extends LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>,
    M extends (retrieve: InferLucidModelRetrievalStrategyFunction<U>['retrieval']) => Brand.Brand.Unbranded<ResolveNestedFunctionReturnType<InferLucidModelRetrievalStrategyFunction<U>['retrieval']>>,
    R = Brand.Brand.Unbranded<ReturnType<M>>,
  >(
    strategy: U,
    method: M,
  ): WithRetrievalStrategy<U, M, R, undefined>;

  /**
   * The `WithRetrievalStrategy` is a holder function that represents a retrieval method
   * of a specific function type.
   *
   * @param strategy - The strategy class that defines the retrieval method.
   * @param method - The method that will be used to retrieve the data.
   * @param options - Query options to be used with the retrieval method.
   */
  <
    U extends LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>,
    M extends (retrieve: InferLucidModelRetrievalStrategyFunction<U>['retrieval']) => Brand.Brand.Unbranded<ResolveNestedFunctionReturnType<InferLucidModelRetrievalStrategyFunction<U>['retrieval']>>,
    O extends WithRetrievalStrategyOptions<InferLucidModelRetrievalStrategySelectColumns<U>, boolean | undefined>,
    R = Brand.Brand.Unbranded<ReturnType<M>>,
  >(
    strategy: U,
    method: M,
    options: O,
  ): WithRetrievalStrategy<U, M, R, InferThrowOption<O>>;

  /**
   * The `WithRetrievalStrategy` is a holder function that represents a retrieval method
   * of a specific function type.
   *
   * @param strategy - The strategy class that defines the retrieval method.
   * @param method - The method that will be used to retrieve the data.
   * @param options - Optional query options to be used with the retrieval method.
   */
  <
    U extends LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>,
    M extends (retrieve: InferLucidModelRetrievalStrategyFunction<U>['retrieval']) => Brand.Brand.Unbranded<ResolveNestedFunctionReturnType<InferLucidModelRetrievalStrategyFunction<U>['retrieval']>>,
    O extends WithRetrievalStrategyOptions<InferLucidModelRetrievalStrategySelectColumns<U>, boolean | undefined> | undefined = undefined,
    R = Brand.Brand.Unbranded<ReturnType<M>>,
    H extends boolean | undefined = InferThrowOption<O>,
  >(
    strategy: U,
    method: M,
    options?: O,
  ): WithRetrievalStrategy<U, M, R, H>;

  /**
   * Check if the given value is a `WithRetrievalStrategy` type by comparing
   * the unique symbol marker to ensure it is a valid retrieval strategy.
   *
   * @param value - The value to check.
   */
  $isWithRetrievalStrategy: <
    U extends LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>,
    M extends (retrieve: InferLucidModelRetrievalStrategyFunction<U>['retrieval']) => Brand.Brand.Unbranded<ResolveNestedFunctionReturnType<InferLucidModelRetrievalStrategyFunction<U>['retrieval']>>,
    R = Brand.Brand.Unbranded<ReturnType<M>>,
    H extends boolean | undefined = undefined,
  >(
    value: unknown
  ) => value is WithRetrievalStrategy<U, M, R, H>;
} = Object.assign(
  <
    U extends LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>,
    M extends (retrieve: InferLucidModelRetrievalStrategyFunction<U>['retrieval']) => Brand.Brand.Unbranded<ResolveNestedFunctionReturnType<InferLucidModelRetrievalStrategyFunction<U>['retrieval']>>,
    O extends WithRetrievalStrategyOptions<InferLucidModelRetrievalStrategySelectColumns<U>, boolean | undefined> | undefined = undefined,
    R = Brand.Brand.Unbranded<ReturnType<M>>,
    H extends boolean | undefined = InferThrowOption<O>,
  >(
    strategy: U,
    method: M,
    options?: O,
  ) => {
    /**
     * Resolve the options to ensure that the `select` property is there.
     */
    const resolvedOptions = defu(options, {
      select: undefined,
      exception: {
        message: undefined,
      },
    })

    /**
     * If the `select` property is an array, we need to ensure that it contains
     * the `id` property. If it is an object, we need to merge it with the `id`
     * property.
     *
     * This is to ensure that the `id` property is always present in the `select`
     * property, as it is required for the retrieval method to work correctly.
     */
    if (Array.isArray(resolvedOptions.select)) {
      resolvedOptions.select = Array.dedupe(Array.append(resolvedOptions.select, 'id'))
    } else if (is.object(resolvedOptions.select)) {
      resolvedOptions.select = merge({ id: 'id' }, resolvedOptions.select)
    }

    return markWithRetrievalStrategy({
      strategy,
      method,
      options: resolvedOptions as WithRetrievalStrategyOptions<InferLucidModelRetrievalStrategySelectColumns<U>, H>,
    } satisfies Brand.Brand.Unbranded<WithRetrievalStrategy<U, M, R, H>> as unknown as WithRetrievalStrategy<U, M, R, H>)
  },
  {
    $isWithRetrievalStrategy: <
      U extends LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>,
      M extends (retrieve: InferLucidModelRetrievalStrategyFunction<U>['retrieval']) => Brand.Brand.Unbranded<ResolveNestedFunctionReturnType<InferLucidModelRetrievalStrategyFunction<U>['retrieval']>>,
      R = Brand.Brand.Unbranded<ReturnType<M>>,
      H extends boolean | undefined = undefined,
    >(
      value: unknown,
    ): value is WithRetrievalStrategy<U, M, R, H> => {
      return !is.nullOrUndefined(value)
        && is.object(value)
        && has(value, WITH_RETRIEVAL_METHOD_MARKER)
        && value[WITH_RETRIEVAL_METHOD_MARKER] === WITH_RETRIEVAL_METHOD_MARKER
    },
  },
)
