import type { WorkspaceTableColumns } from '#models/workspace_model'
import type { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import HttpContext from '#core/http/contexts/http_context'
import { LucidModelRetrievalStrategy } from '#core/lucid/factories/lucid_model_retrieval_strategy'
import Workspace from '#models/workspace_model'
import is from '@adonisjs/core/helpers/is'
import { Effect } from 'effect'
import { defaultTo } from 'lodash-es'

/**
 * Strategy to retrieve a workspace using a custom query builder, with the option to
 * transform the result.
 */
export class RetrieveWorkspaceUsingQuery extends LucidModelRetrievalStrategy('shared/workspace/retrieve_workspace_using_query')<WorkspaceTableColumns>()({
  model: Workspace,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    /**
     * @param tag - The tag to be used for the retrieval strategy, for telemetry purposes.
     */
    return (tag: string) => {
      /**
       * @param builder - The function that takes a query builder and returns a promise of the result.
       */
      return <T = Workspace | Workspace[] | null | undefined>(builder: (query: ModelQueryBuilderContract<typeof Workspace>) => Promise<T>) => withStrategy(
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
 * Strategy to retrieve a workspace using an identifier object, which contains a key and value.
 */
export class RetrieveWorkspaceUsingIdentifier extends LucidModelRetrievalStrategy('shared/workspace/retrieve_workspace_using_identifier')<WorkspaceTableColumns>()({
  model: Workspace,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    /**
     * @param identifier - The identifier to be used for the retrieval strategy.
     */
    return (identifier: WorkspaceIdentifier) => withStrategy(
      Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan('workspace_identifier', identifier)

        return yield* Effect.tryPromise(() => query.select(defaultTo(options?.select, '*') as string).where(identifier.key, identifier.value).first())
      }),
    )
  },

}) {}

/**
 * Strategy to retrieve the active workspace from the context.
 * This is used to get the workspace that is currently active for the user.
 */
export class RetrieveActiveWorkspace extends LucidModelRetrievalStrategy('shared/workspace/retrieve_active_workspace')<WorkspaceTableColumns>()({
  model: Workspace,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    return () => withStrategy(
      Effect.gen(function* () {
        const { context } = yield* HttpContext
        const activeWorkspaceIdentifier = yield* context.pipe(
          Effect.map(ctx => ctx.activeWorkspaceIdentifier),
        )

        yield* Effect.annotateCurrentSpan('active_workspace_identifier', activeWorkspaceIdentifier)
        return yield* Effect.tryPromise(() => query.select(defaultTo(options?.select, '*') as string).where(activeWorkspaceIdentifier.key, activeWorkspaceIdentifier.value).first())
      }),
    )
  },
}) {}
