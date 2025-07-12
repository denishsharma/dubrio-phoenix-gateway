import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseService from '#core/database/services/database_service'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import NoActiveWorkspaceException from '#modules/workspace/exceptions/no_active_workspace_exception'
import { RetrieveWorkspaceUsingIdentifier } from '#shared/retrieval_strategies/workspace_retrieval_strategy'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import is from '@adonisjs/core/helpers/is'
import { Effect, pipe, Schema } from 'effect'

/**
 * Middleware to ensure that the active workspace is set in the context.
 * It retrieves the active workspace identifier from the session and sets it in the context.
 * If no active workspace is found, it throws a NoActiveWorkspaceException.
 */
export default class ActiveWorkspaceMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await Effect.gen(function* () {
      const database = yield* DatabaseService
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const telemetry = yield* TelemetryService

      return yield* Effect.gen(function* () {
        /**
         * Retrieve the active workspace identifier from the session.
         * If it is not set, throw a NoActiveWorkspaceException.
         */
        const activeWorkspace = ctx.session.get('active_workspace')
        if (is.nullOrUndefined(activeWorkspace)) {
          return yield* new NoActiveWorkspaceException()
        }

        /**
         * Require the transaction from the database service.
         */
        const { trx } = yield* database.requireTransaction()

        /**
         * Decode the active workspace identifier.
         */
        const activeWorkspaceIdentifier = yield* pipe(
          activeWorkspace,
          Schema.decodeUnknown(
            Schema.ULID,
          ),
          SchemaError.fromParseError('Unexpected error occurred while decoding the active workspace ID.'),
        )

        /**
         * Retrieve the workspace using the active workspace identifier.
         * If no workspace is found, throw a NoActiveWorkspaceException.
         */
        yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(WorkspaceIdentifier.make(activeWorkspaceIdentifier)),
            {
              exception: {
                throw: true,
              },
              select: ['uid'],
              query: {
                client: trx,
              },
            },
          ),
          lucidModelRetrieval.retrieve,

          /**
           * Handle the case where the workspace is not found.
           * If it is not found, forget the active workspace in the session
           * and throw a NoActiveWorkspaceException.
           */
          Effect.catchTag(
            '@error/exception/resource_not_found',
            error => Effect.gen(function* () {
              ctx.session.forget('active_workspace')
              return yield* new NoActiveWorkspaceException(undefined, { cause: error })
            }),
          ),

          /**
           * Set the active workspace identifier in the context.
           */
          Effect.tap(workspace => Effect.sync(() => {
            ctx.activeWorkspaceIdentifier = WorkspaceIdentifier.make(workspace.uid)
          })),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('active_workspace'),
        telemetry.withScopedTelemetry('active_workspace_middleware'),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))

    const output = await next()
    return output
  }
}

/**
 * Extend the HttpContext to include the active workspace identifier.
 * This allows the active workspace identifier to be accessed in the context of the application.
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    /**
     * The active workspace identifier.
     * This is set by the ActiveWorkspaceMiddleware and can be used throughout the application.
     */
    activeWorkspaceIdentifier: WorkspaceIdentifier;
  }
}
