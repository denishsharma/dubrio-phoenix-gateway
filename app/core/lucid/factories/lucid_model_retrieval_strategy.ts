import type { ResolveNestedFunctionReturnType } from '#types/function'
import type { Database } from '@adonisjs/lucid/database'
import type { LucidModel, ModelAdapterOptions, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { Brand } from 'effect'
import type { EmptyObject } from 'type-fest'
import { INTERNALS_MARKER } from '#constants/proto_marker'
import { LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER } from '#core/lucid/constants/lucid_marker'
import { RetrievalStrategyInstance } from '#core/lucid/constants/retrieval_strategy_instance'
import is from '@adonisjs/core/helpers/is'
import stringHelpers from '@adonisjs/core/helpers/string'
import { defu } from 'defu'
import { Array, Effect, flow, Match, Option, pipe, Record } from 'effect'
import { merge, omit } from 'lodash-es'

/**
 * A unique symbol used to mark the returned type of the strategy function
 * to type check the use of `withStrategy` in the strategy function.
 */
export const WITH_LUCID_MODEL_STRATEGY_FUNCTION_MARKER: unique symbol = Symbol('@marker/lucid/with_lucid_model_strategy_function')

/**
 * The options for the strategy function without the query options.
 */
export type StrategyOptions<L extends Record<string, unknown> | never> = {
  /**
   * The trashed state to include in the query.
   *
   * This can be one of the following:
   * - 'with': Include trashed records in the query.
   * - 'only': Only include trashed records in the query.
   * - 'without': Exclude trashed records from the query (default).
   *
   * If model doesn't support trashed records, this option will be ignored
   * and will include all records in the query.
   */
  trashed?: 'with' | 'only' | 'without';
} & (
  [L] extends [never]
    ? EmptyObject
    : {
        /**
         * The columns to select in the query.
         */
        select?: '*' | (keyof L)[] | Record<string, keyof L | (string & {}) | (ReturnType<Database['knexRawQuery']> & {})>;
      }
    )

/**
 * The options for the strategy function with the query options.
 */
export type StrategyOptionsWithQuery<L extends Record<string, unknown> | never> = StrategyOptions<L> & {
  query?: ModelAdapterOptions;
}

/**
 * Helper type to infer the resolved success type of the strategy function.
 */
export type InferStrategySuccess<S>
  = ResolveNestedFunctionReturnType<S> extends Effect.Effect<infer A, any, any> ? A : never

/**
 * Helper type to extract the return type of the strategy function
 * based on the `transformed` flag.
 *
 * If `transformed` is true, the return type is `A`, otherwise it is `P`.
 */
export type StrategyFunctionReturnType<
  M extends LucidModel,
  K extends InstanceType<M>,
  P extends K | K[] | null | undefined,
  A,
  C extends boolean,
> = C extends true ? A : P

/**
 * The type of the strategy function that is used to retrieve the model instance
 * with the provided options.
 */
export type StrategyFunction<
  M extends LucidModel,
  K extends InstanceType<M>,
  P extends K | K[] | null | undefined,
  L extends Record<string, unknown> | never,
  C extends boolean,
> = (
  withStrategy: <S, E, R>(effect: Effect.Effect<StrategyFunctionReturnType<M, K, P, S, C>, E, R>) => Brand.Branded<Effect.Effect<StrategyFunctionReturnType<M, K, P, S, C>, E, R>, typeof WITH_LUCID_MODEL_STRATEGY_FUNCTION_MARKER>,
  query: ModelQueryBuilderContract<M, K>,
  options?: StrategyOptions<L>,
) => (...args: any[]) => any

/**
 * The internals of the lucid model retrieval strategy class that are
 * used to store the configuration and the state of the strategy.
 */
interface LucidModelRetrievalStrategyInternals<
  M extends LucidModel,
  K extends InstanceType<M>,
  P extends K | K[] | null | undefined,
  L extends Record<string, unknown> | never,
  C extends boolean,
  S extends StrategyFunction<M, K, P, L, C>,
> {
  strategy: S;
  exception: {
    message: string | ((resource: string) => string);
  };
}

/**
 * Helper type that validates the return type of the strategy function
 * to ensure that it is a branded Effect with the provided type.
 */
type ValidateStrategyReturn<
  M extends LucidModel,
  K extends InstanceType<M>,
  P extends K | K[] | null | undefined,
  L extends Record<string, unknown> | never,
  C extends boolean,
  S extends StrategyFunction<M, K, P, L, C>,
  A = InferStrategySuccess<S>,
> = ResolveNestedFunctionReturnType<S> extends Brand.Branded<Effect.Effect<any, any, any>, typeof WITH_LUCID_MODEL_STRATEGY_FUNCTION_MARKER>
  ? C extends true
    ? A extends Effect.Effect.Success<ResolveNestedFunctionReturnType<S>>
      ? unknown
      : StrategyValidationError<`Returned success type must be same as the provided A.`>
    : P extends Effect.Effect.Success<ResolveNestedFunctionReturnType<S>>
      ? unknown
      : StrategyValidationError<`Returned success type must be same as the provided P which is the model instance or nullish value.`>
  : StrategyValidationError<'Strategy function must be wrapped in withStrategy() and return a branded Effect with the provided type.'>

/**
 * Helper type to define the error message for the strategy function validation.
 */
interface StrategyValidationError<Message extends string> {
  __strategy_error__: Message;
}

/**
 * The options for customizing the retrieval strategy factory that
 * creates the model retrieval strategy class.
 */
type LucidModelRetrievalStrategyFactoryOptions<
  M extends LucidModel,
  K extends InstanceType<M>,
  P extends K | K[] | null | undefined,
  L extends Record<string, unknown> | never,
  C extends boolean,
  S extends StrategyFunction<M, K, P, L, C>,
  A = InferStrategySuccess<S>,
> = {
  /**
   * The model class that the strategy is associated with
   * and used to retrieve the model instance.
   */
  model: M;

  /**
   * The flag that indicates whether the strategy should
   * return the model instance or a transformed value based on the
   * provided strategy function.
   *
   * If true, the strategy function can return any type of value, else
   * it must return the model instance or nullish value.
   */
  transformed: C;

  /**
   * The strategy function that is used to retrieve the model instance
   * with the provided options.
   *
   * The strategy function must be wrapped in `withStrategy()` and return a branded Effect
   * with the provided type.
   *
   * It provides the signature: (withStrategy, query, options) => (...args: any[]) => any
   *
   * It must return the function that is used to retrieve the model instance
   * with the provided options, even if function doesn't take any arguments.
   *
   * @example
   * ```ts
   * const strategy = (withStrategy, query, options) => {
   *   return () => {
   *     return withStrategy(Effect.tryPromise(() => query.first()))
   *   }
   * }
   * ```
   *
   * @param withStrategy - The function that is used to wrap the effect and return a branded Effect
   * @param query - The query builder instance that is used to retrieve the model instance
   * @param options - The options for the strategy function
   */
  strategy: S;

  /**
   * The options for customizing the exception message that is thrown
   * when the strategy fails to retrieve the model instance.
   */
  exception?: {
    /**
     * The message to be used for the exception.
     * It can be a string or a function that takes the resource name as an argument.
     */
    message?: string | ((resource: string) => string);
  };
} & ValidateStrategyReturn<M, K, P, L, C, S, A>

/**
 * Base factory function for creating a base class for the lucid model retrieval strategy
 * that is used to retrieve the model instance with the provided options.
 */
function base<
  T extends string,
  M extends LucidModel,
  K extends InstanceType<M>,
  P extends K | K[] | null | undefined,
  L extends Record<string, unknown> | never,
  C extends boolean,
  S extends StrategyFunction<M, K, P, L, C>,
  A = InferStrategySuccess<S>,
>(tag: T, factoryOptions: LucidModelRetrievalStrategyFactoryOptions<M, K, P, L, C, S, A>) {
  class Factory {
    static get [LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER]() { return LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER }

    readonly _tag: T = tag
    get [Symbol.toStringTag]() { return this._tag }

    /**
     * The model class that the strategy is associated with
     * and used to retrieve the model instance.
     */
    readonly model: M = factoryOptions.model

    /**
     * The internals of the lucid model retrieval strategy class that are
     * used to store the configuration and the state of the strategy.
     */
    readonly [INTERNALS_MARKER]: LucidModelRetrievalStrategyInternals<M, K, P, L, C, S> = {
      strategy: factoryOptions.strategy,
      exception: defu(factoryOptions.exception, {
        message: `Failed to retrieve ${stringHelpers.pascalCase(stringHelpers.singular(factoryOptions.model.name))} resource with the '${this._tag}' strategy and the provided options.`,
      }),
    }

    /**
     * The strategy function that is used to retrieve the model instance
     * with the provided options.
     *
     * @param options - The options for the strategy function
     */
    strategy(options?: StrategyOptionsWithQuery<L>) {
      const providedStrategy = this[INTERNALS_MARKER].strategy

      const withStrategy = <H, E, R>(effect: Effect.Effect<H, E, R>) => {
        const result = Effect.gen(function* () {
          return yield* effect
        })
        return result as Brand.Branded<typeof result, typeof WITH_LUCID_MODEL_STRATEGY_FUNCTION_MARKER>
      }

      const resolvedOptions = defu(
        options,
        {
          trashed: 'without',
        } satisfies Partial<StrategyOptionsWithQuery<L>>,
      )

      /**
       * Ensures that the select fields are valid and includes the default 'id' field.
       * This is used to ensure that the query always selects the 'id' field
       * and any other fields that are specified in the options.
       */
      const ensureSelect = Match.value((options as StrategyOptionsWithQuery<Record<string, unknown>>).select).pipe(
        Match.when((select: unknown) => Array.isArray(select), flow(Array.prepend('id'), Array.dedupe)),
        Match.when((select: unknown) => is.object(select), flow(Record.set('id', 'id'))),
        Match.orElse(() => '*' as const),
      ) as '*' | (keyof L)[] | Record<string, keyof L | (string & {}) | (ReturnType<Database['knexRawQuery']> & {})>

      const query = pipe(
        Match.value(resolvedOptions.trashed).pipe(
          Match.when(
            'only',
            () => {
              const modelWithOnlyTrashed = this.model as (M & { onlyTrashed?: unknown })
              return (is.function(modelWithOnlyTrashed.onlyTrashed) ? modelWithOnlyTrashed.onlyTrashed() : modelWithOnlyTrashed.query()) as ModelQueryBuilderContract<M, K>
            },
          ),
          Match.when(
            'with',
            () => {
              const modelWithWithTrashed = this.model as (M & { withTrashed?: unknown })
              return (is.function(modelWithWithTrashed.withTrashed) ? modelWithWithTrashed.withTrashed() : modelWithWithTrashed.query()) as ModelQueryBuilderContract<M, K>
            },
          ),
          Match.orElse(() => this.model.query() as ModelQueryBuilderContract<M, K>),
        ),
        (q) => {
          if (is.nullOrUndefined((options as StrategyOptionsWithQuery<Record<string, unknown>>).select)) {
            return q
          }
          return q.select(ensureSelect as string)
        },
      )

      return providedStrategy(withStrategy, query as ModelQueryBuilderContract<M, K>, merge({}, omit(options, 'query'), { select: ensureSelect })) as ReturnType<S>
    }

    /**
     * Returns the string representation of the class.
     * This is used for debugging and logging purposes.
     */
    toString() {
      return `LucidModelRetrievalStrategy<${this._tag}>`
    }

    /**
     * Returns the string representation of the class.
     * This is used for debugging and logging purposes.
     */
    toJSON() {
      return {
        _tag: this._tag,
        model: this.model.name,
      }
    }

    /**
     * Returns the inspectable representation of the class which includes
     * internals of the class and the model name.
     *
     * This is used for debugging and logging purposes.
     */
    toInspectable() {
      return {
        _tag: this._tag,
        model: this.model.name,
        ...this[INTERNALS_MARKER],
      }
    }
  }
  ;(Factory.prototype as any).name = tag
  return Factory
}

/**
 * Instance type of the base lucid model retrieval strategy class that
 * is created by the base factory function.
 */
type BaseInstance<
  T extends string,
  M extends LucidModel,
  K extends InstanceType<M>,
  P extends K | K[] | null | undefined,
  L extends Record<string, unknown> | never,
  C extends boolean,
  S extends StrategyFunction<M, K, P, L, C>,
  A = InferStrategySuccess<S>,
> = InstanceType<ReturnType<typeof base<T, M, K, P, L, C, S, A>>>

/**
 * Factory function for creating a lucid model retrieval strategy class
 * with the unique tag and the provided options to the factory function.
 *
 * Tag is prefixed with `@lucid_model_retrieval_strategy/` to ensure uniqueness
 * and to avoid conflicts with other lucid model retrieval strategies in the application.
 *
 * Purpose of this function is to create a lucid model retrieval strategy class
 * that can be used to retrieve the model instance with the provided options.
 *
 * @see {@link LucidModelRetrievalStrategyFactoryOptions} for more information on the options.
 *
 * @param tag - The unique tag for the strategy class.
 */
export function LucidModelRetrievalStrategy<T extends string>(tag: T) {
  type RT = `@lucid_model_retrieval_strategy/${T}`
  const resolvedTag = `@lucid_model_retrieval_strategy/${tag}` as RT

  /**
   * @template L - The type of the available table columns in the model, used to define the selectable columns.
   */
  return <L extends Record<string, unknown> | never = never>() => {
    /**
     * @param factoryOptions - The options for customizing the retrieval strategy factory.
     */
    return <
      M extends LucidModel,
      K extends InstanceType<M>,
      P extends K | K[] | null | undefined,
      C extends boolean,
      S extends StrategyFunction<M, K, P, L, C>,
      A = InferStrategySuccess<S>,
    >(factoryOptions: LucidModelRetrievalStrategyFactoryOptions<M, K, P, L, C, S, A>) => {
      class ModelRetrievalStrategy extends base<RT, M, K, P, L, C, S, A>(resolvedTag, factoryOptions) {
        /**
         * Create a new instance of the retrieval strategy if it doesn't already exist,
         * otherwise return the existing instance.
         *
         * This method is used to ensure that the same instance of the retrieval strategy
         * is used throughout the application, preventing multiple instances from being created.
         */
        static make<V extends ModelRetrievalStrategy>(this: new () => V) {
          const existingInstance = RetrievalStrategyInstance.get<RT, V>(resolvedTag)
          if (Option.isNone(existingInstance)) {
            const instance = new this()
            RetrievalStrategyInstance.set(resolvedTag, instance as any)
            return instance
          }
          return existingInstance.value
        }
      }
      ;(ModelRetrievalStrategy.prototype as any).name = resolvedTag
      ;(ModelRetrievalStrategy as any).__tag__ = resolvedTag

      return ModelRetrievalStrategy as unknown as (new () => Brand.Branded<InstanceType<typeof ModelRetrievalStrategy>, typeof LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER>) & { readonly make: typeof ModelRetrievalStrategy['make']; readonly [LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER]: typeof LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER }
    }
  }
}

/**
 * The instance type of the lucid model retrieval strategy class that is created
 * using the lucid model retrieval strategy factory function.
 */
export type LucidModelRetrievalStrategy<
  T extends string,
  M extends LucidModel,
  K extends InstanceType<M>,
  P extends K | K[] | null | undefined,
  L extends Record<string, unknown> | never,
  C extends boolean,
  S extends StrategyFunction<M, K, P, L, C>,
  A = InferStrategySuccess<S>,
> = Brand.Branded<BaseInstance<T, M, K, P, L, C, S, A>, typeof LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER>

/**
 * The type of the lucid model retrieval strategy class that is created
 * using the lucid model retrieval strategy factory function.
 */
export type LucidModelRetrievalStrategyClass<
  T extends string,
  M extends LucidModel,
  K extends InstanceType<M>,
  P extends K | K[] | null | undefined,
  L extends Record<string, unknown> | never,
  C extends boolean,
  S extends StrategyFunction<M, K, P, L, C>,
  A = InferStrategySuccess<S>,
>
  = & (new () => LucidModelRetrievalStrategy<T, M, K, P, L, C, S, A>)
    & { readonly make: () => LucidModelRetrievalStrategy<T, M, K, P, L, C, S, A>; readonly [LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER]: typeof LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER }

/**
 * Helper type to infer the return type of the strategy function
 * based on the provided lucid model retrieval strategy class or instance.
 */
export type InferLucidModelRetrievalStrategyFunction<U extends LucidModelRetrievalStrategy<any, any, any, any, any, any, any, any> | LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>>
  = U extends LucidModelRetrievalStrategy<any, infer _M, infer _K, infer _P, infer L, infer _C, infer S, infer _A>
    ? { retrieval: ReturnType<S>; strategy: (options?: StrategyOptionsWithQuery<L>) => ReturnType<S>; raw: S }
    : U extends LucidModelRetrievalStrategyClass<any, infer _M, infer _K, infer _P, infer L, infer _C, infer S, infer _A>
      ? { retrieval: ReturnType<S>; strategy: (options?: StrategyOptionsWithQuery<L>) => ReturnType<S>; raw: S }
      : never

/**
 * Helper type to infer the select columns of the strategy function
 * based on the provided lucid model retrieval strategy class or instance.
 */
export type InferLucidModelRetrievalStrategySelectColumns<U extends LucidModelRetrievalStrategy<any, any, any, any, any, any, any, any> | LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>>
  = U extends LucidModelRetrievalStrategy<any, any, any, any, infer L, any, any, any>
    ? L
    : U extends LucidModelRetrievalStrategyClass<any, any, any, any, infer L, any, any, any>
      ? L
      : never
