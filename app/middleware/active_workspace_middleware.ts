import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import Workspace from '#models/workspace_model'
import NoActiveWorkspaceException from '#modules/workspace/exceptions/no_active_workspace_exception'
import is from '@adonisjs/core/helpers/is'
import { Effect, pipe, Schema } from 'effect'

export default class ActiveWorkspaceMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await Effect.gen(function* () {
      const telemetry = yield* TelemetryService

      return yield* Effect.gen(function* () {
        const activeWorkspace = ctx.session.get('active_workspace')

        if (is.nullOrUndefined(activeWorkspace)) {
          return yield* new NoActiveWorkspaceException()
        }

        const activeWorkspaceId = yield* pipe(
          activeWorkspace,
          Schema.decodeUnknown(
            Schema.ULID,
          ),
          SchemaError.fromParseError('Unexpected error occurred while decoding the active workspace ID.'),
        )

        const workspace = yield* Effect.tryPromise({
          try: () => Workspace.query()
            .where('uid', activeWorkspaceId)
            .first(),
          catch: NoActiveWorkspaceException.fromUnknownError(),
        })

        if (is.nullOrUndefined(workspace)) {
          ctx.session.forget('active_workspace')
          return yield* new NoActiveWorkspaceException()
        }
        ctx.activeWorkspaceId = workspace.uid
      }).pipe(
        telemetry.withTelemetrySpan('active_workspace'),
        telemetry.withScopedTelemetry('active_workspace_middleware'),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))

    const output = await next()
    return output
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    activeWorkspaceId: string;
  }
}
