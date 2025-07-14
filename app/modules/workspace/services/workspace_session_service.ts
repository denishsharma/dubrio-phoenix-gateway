import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type SetActiveWorkspaceSessionPayload from '#modules/workspace/payloads/workspace_session/set_active_workspace_session_payload'
import DatabaseService from '#core/database/services/database_service'
import HttpContext from '#core/http/contexts/http_context'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import NoActiveWorkspaceException from '#modules/workspace/exceptions/no_active_workspace_exception'
import CurrentWorkspaceSession from '#modules/workspace/schemas/current_workspace_session_schema'
import { RetrieveWorkspaceUsingIdentifier } from '#shared/retrieval_strategies/workspace_retrieval_strategy'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import is from '@adonisjs/core/helpers/is'
import { Effect, pipe, Schema } from 'effect'

/**
 * Constant to identify the current workspace session in the HTTP context.
 */
export const WORKSPACE_SESSION_IDENTIFIER = 'current_workspace_session'

export default class WorkspaceSessionService extends Effect.Service<WorkspaceSessionService>()('@service/modules/workspace/workspace_session', {
  dependencies: [
    DatabaseService.Default,
    LucidModelRetrievalService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const lucidModelRetrieval = yield* LucidModelRetrievalService
    const telemetry = yield* TelemetryService

    const activeWorkspaceIdentifier = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context

      /**
       * Retrieve the current workspace session from the HTTP context.
       * This will decode the session data to ensure it contains a valid workspace identifier.
       */
      const workspaceSession = yield* pipe(
        ctx.session.get(WORKSPACE_SESSION_IDENTIFIER),
        Schema.decodeUnknown(Schema.NullishOr(CurrentWorkspaceSession), { errors: 'all' }),
        SchemaError.fromParseError('Unexpected error occurred while decoding the active workspace from the session.'),
      )

      /**
       * If the session is not set, return a NoActiveWorkspaceException.
       */
      if (is.nullOrUndefined(workspaceSession)) {
        return yield* new NoActiveWorkspaceException()
      }

      return workspaceSession.workspace_identifier
    }).pipe(telemetry.withTelemetrySpan('get_active_workspace_identifier'))

    const activeWorkspace = Effect.gen(function* () {
      const { trx } = yield* database.requireTransaction()

      const { context } = yield* HttpContext
      const ctx = yield* context

      /**
       * Retrieve the current workspace session from the HTTP context.
       * This will decode the session data to ensure it contains a valid workspace identifier.
       */
      const workspaceSession = yield* pipe(
        ctx.session.get(WORKSPACE_SESSION_IDENTIFIER),
        Schema.decodeUnknown(Schema.NullishOr(CurrentWorkspaceSession), { errors: 'all' }),
        SchemaError.fromParseError('Unexpected error occurred while decoding the active workspace from the session.'),
      )

      /**
       * If the session is not set, return a NoActiveWorkspaceException.
       */
      if (is.nullOrUndefined(workspaceSession)) {
        return yield* new NoActiveWorkspaceException()
      }

      return yield* pipe(
        WithRetrievalStrategy(
          RetrieveWorkspaceUsingIdentifier,
          retrieve => retrieve(workspaceSession.workspace_identifier),
          {
            exception: {
              throw: true,
            },
            transaction: {
              trx,
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
            ctx.session.forget(WORKSPACE_SESSION_IDENTIFIER)
            return yield* new NoActiveWorkspaceException(undefined, { cause: error })
          }),
        ),
      )
    }).pipe(telemetry.withTelemetrySpan('get_active_workspace_session'))

    function setActiveWorkspace(payload: ProcessedDataPayload<SetActiveWorkspaceSessionPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        const { context } = yield* HttpContext
        const ctx = yield* context

        /**
         * Retrieve the workspace using the identifier from the payload.
         * This will ensure that the workspace exists and is accessible.
         */
        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(payload.workspace_identifier),
            {
              exception: {
                throw: true,
              },
              transaction: {
                trx,
              },
              select: ['uid'],
            },
          ),
          lucidModelRetrieval.retrieve,
        )

        yield* pipe(
          {
            workspace_identifier: WorkspaceIdentifier.make(workspace.uid),
          },
          Schema.encode(CurrentWorkspaceSession, { errors: 'all' }),
          SchemaError.fromParseError('Unexpected error occurred while encoding the active workspace session.'),
          Effect.tap(data => ctx.session.put(WORKSPACE_SESSION_IDENTIFIER, data)),
        )
      }).pipe(telemetry.withTelemetrySpan('set_current_workspace_session'))
    }

    return {
      /**
       * Retrieve the active workspace identifier from the HTTP context.
       * This will decode the session data to ensure it contains a valid workspace identifier.
       *
       * This will not ensure that the workspace exists,
       * it will only return the identifier from the session.
       *
       * If the session is not set, it will raise a NoActiveWorkspaceException.
       */
      activeWorkspaceIdentifier,

      /**
       * Retrieve the current workspace session from the HTTP context.
       * This will decode the session data to ensure it contains a valid workspace identifier.
       *
       * If the session is not set, or the workspace is not found,
       * it will raise a NoActiveWorkspaceException.
       */
      activeWorkspace,

      /**
       * Set the current workspace session in the HTTP context.
       * This will encode the workspace identifier into the session.
       *
       * @param payload - The payload containing the workspace identifier to set as the current session.
       */
      setActiveWorkspace,
    }
  }),
}) {}
