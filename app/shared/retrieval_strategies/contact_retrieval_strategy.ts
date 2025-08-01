import type { ContactTableColumns } from '#models/contact_model'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { LucidModelRetrievalStrategy } from '#core/lucid/factories/lucid_model_retrieval_strategy'
import Contact from '#models/contact_model'
import is from '@adonisjs/core/helpers/is'
import { Effect } from 'effect'
import { defaultTo } from 'lodash-es'

/**
 * Strategy to retrieve a contact using a custom query builder, with the option to
 * transform the result.
 */
export class RetrieveContactUsingQuery extends LucidModelRetrievalStrategy('shared/contact/retrieve_contact_using_query')<ContactTableColumns>()({
  model: Contact,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    /**
     * @param tag - The tag to be used for the retrieval strategy, for telemetry purposes.
     */
    return (tag: string) => {
      /**
       * @param builder - The function that takes a query builder and returns a promise of the result.
       */
      return <T = Contact | Contact[] | null | undefined>(builder: (query: ModelQueryBuilderContract<typeof Contact>) => Promise<T>) => withStrategy(
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
 * Strategy to retrieve a contact using an identifier object, which contains a key and value.
 */
export class RetrieveContactUsingIdentifier extends LucidModelRetrievalStrategy('shared/contact/retrieve_contact_using_identifier')<ContactTableColumns>()({
  model: Contact,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    /**
     * @param identifier - The identifier to be used for the retrieval strategy.
     */
    return (identifier: { key: string; value: any }) => withStrategy(
      Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan('contact_identifier', identifier)

        return yield* Effect.tryPromise(() => query.select(defaultTo(options?.select, '*') as string).where(identifier.key, identifier.value).first())
      }),
    )
  },
}) {}
