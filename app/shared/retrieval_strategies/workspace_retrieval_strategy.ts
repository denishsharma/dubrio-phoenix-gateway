import type { WorkspaceTableColumns } from '#models/workspace_model'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { LucidModelRetrievalStrategy } from '#core/lucid/factories/lucid_model_retrieval_strategy'
import Workspace from '#models/workspace_model'
import is from '@adonisjs/core/helpers/is'
import { Effect } from 'effect'

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
            const qb = is.nullOrUndefined(options?.select) ? builder(query) : builder(query.select(options?.select as string))
            return await (qb as Promise<T>)
          })
        }),
      )
    }
  },
}) {}

export class RetrieveWorkspaceUsingColumn extends LucidModelRetrievalStrategy('shared/workspace/retrieve_workspace_by_column')<WorkspaceTableColumns>()({
  model: Workspace,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    /**
     * @param column - The column to be used for the retrieval strategy.
     * @param value - The value to be used for the retrieval strategy.
     */
    return (column: keyof WorkspaceTableColumns, value: string) => withStrategy(
      Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan('column_name', column)

        return yield* Effect.tryPromise(() => query.select(options?.select as string).where(column, value).first())
      }),
    )
  },
}) {}

export class RetrieveWorkspaceByUid extends LucidModelRetrievalStrategy('shared/workspace/retrieve_workspace_by_id')<WorkspaceTableColumns>()({
  model: Workspace,
  transformed: true,
  strategy: (withStrategy, query, options) => {
    /**
     * @param id - The ID of the workspace to retrieve.
     */
    return (id: number) => withStrategy(
      Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan('workspace_id', id)

        return yield* Effect.tryPromise(() => query.select(options?.select as string).where('uid', id).first())
      }),
    )
  },
}) {}
