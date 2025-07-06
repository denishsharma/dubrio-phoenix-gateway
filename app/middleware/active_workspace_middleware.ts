import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import SchemaError from '#core/schema/errors/schema_error'
import Workspace from '#models/workspace_model'
import { Effect, pipe, Schema } from 'effect'

export default class ActiveWorkspaceMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Middleware logic goes here (before the next call)
     */

    const activeWorkspace = ctx.session.get('active_workspace')

    if (!activeWorkspace) {
      ctx.response.status(403).send('No active workspace found. Please set an active workspace.')
      return
    }

    const program = pipe(
      activeWorkspace,
      Schema.decodeUnknown(
        Schema.ULID,
      ),
      SchemaError.fromParseError('Unexpected error occurred while decoding the active workspace ID.'),
    )
    const activeWorkspaceId = await Effect.runPromise(program)

    const workspace = await Workspace.query()
      .where('uid', activeWorkspaceId)
      .first()

    if (!workspace) {
      ctx.response.status(403).send('Active workspace not found or you do not have access to it.')
      return
    }
    ctx.activeWorkspaceId = workspace.uid

    /**
     * Call next method in the pipeline and return its output
     */
    const output = await next()
    return output
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    activeWorkspaceId: string;
  }
}
