import type { UserTableColumns } from '#models/user_model'
import type { UserIdentifier } from '#shared/schemas/user/user_attributes'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { StrictValues } from '@adonisjs/lucid/types/querybuilder'
import { LucidModelRetrievalStrategy } from '#core/lucid/factories/lucid_model_retrieval_strategy'
import User from '#models/user_model'
import is from '@adonisjs/core/helpers/is'
import { Effect } from 'effect'
import { defaultTo } from 'lodash-es'

/**
 * Strategy to retrieve a user using a custom query builder, with the option to
 * transform the result.
 */
export class RetrieveUserUsingQuery extends LucidModelRetrievalStrategy('shared/user/retrieve_user_using_query')<UserTableColumns>()({
  model: User,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    /**
     * @param tag - The tag to be used for the retrieval strategy, for telemetry purposes.
     */
    return (tag: string) => {
      /**
       * @param builder - The function that takes a query builder and returns a promise of the result.
       */
      return <T = User | User[] | null | undefined>(builder: (query: ModelQueryBuilderContract<typeof User>) => Promise<T>) => withStrategy(
        Effect.gen(function* () {
          yield* Effect.annotateCurrentSpan('retrieval_strategy', tag)

          return yield* Effect.tryPromise(async () => {
            const qb = is.nullOrUndefined(options?.select) ? builder(query) : builder(query.select(defaultTo(options?.select, '*') as string))
            return await (qb as Promise<T>)
          })
        }),
      )
    }
  },
}) {}

/**
 * Strategy to retrieve a user by a specific column and value.
 */
export class RetrieveUserUsingColumn extends LucidModelRetrievalStrategy('shared/user/retrieve_user_by_column')<UserTableColumns>()({
  model: User,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    /**
     * @param column - The column to be used for the retrieval strategy.
     * @param value - The value to be used for the retrieval strategy.
     */
    return (column: keyof UserTableColumns, value: StrictValues) => withStrategy(
      Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan('column_name', column)

        return yield* Effect.tryPromise(() => query.select(defaultTo(options?.select, '*') as string).where(column, value).first())
      }),
    )
  },
}) {}

/**
 * Strategy to retrieve a user using an identifier object, which contains a key and value.
 */
export class RetrieveUserUsingIdentifier extends LucidModelRetrievalStrategy('shared/user/retrieve_user_using_identifier')<UserTableColumns>()({
  model: User,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    /**
     * @param identifier - The identifier to be used for the retrieval strategy.
     */
    return (identifier: UserIdentifier) => withStrategy(
      Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan('user_identifier', identifier)

        return yield* Effect.tryPromise(() => query.select(defaultTo(options?.select, '*') as string).where(identifier.key, identifier.value).first())
      }),
    )
  },
}) {}
