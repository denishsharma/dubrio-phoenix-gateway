import type { SpaceTableColumns } from '#models/space_model'
import type { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { LucidModelRetrievalStrategy } from '#core/lucid/factories/lucid_model_retrieval_strategy'
import Space from '#models/space_model'
import is from '@adonisjs/core/helpers/is'
import { Effect } from 'effect'
import { defaultTo } from 'lodash-es'

/**
 * Strategy to retrieve a space using a custom query builder, with the option to
 * transform the result.
 */
export class RetrieveSpaceUsingQuery extends LucidModelRetrievalStrategy('shared/space/retrieve_space_using_query')<SpaceTableColumns>()({
  model: Space,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    return (tag: string) => {
      return <T = Space | Space[] | null | undefined>(builder: (query: ModelQueryBuilderContract<typeof Space>) => Promise<T>) => withStrategy(
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
 * Strategy to retrieve a space using an identifier object, which contains a key and value.
 */
export class RetrieveSpaceUsingIdentifier extends LucidModelRetrievalStrategy('shared/space/retrieve_space_using_identifier')<SpaceTableColumns>()({
  model: Space,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    return (identifier: SpaceIdentifier) => withStrategy(
      Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan('space_identifier', identifier)
        return yield* Effect.tryPromise(() => query.select(defaultTo(options?.select, '*') as string).where(identifier.key, identifier.value).first())
      }),
    )
  },
}) {}
