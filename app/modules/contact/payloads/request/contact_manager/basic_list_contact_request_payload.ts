import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Match, Schema } from 'effect'

export default class BasicListContactRequestPayload extends DataPayload('modules/contact/requests/list_contact_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      __qs: vine.object({
        workspace_id: vine.string().trim().ulid().optional(),
        next_id: vine.number().optional(),
        limit: vine.number().min(1).max(100).optional(),
      }),
    }),
  ),
  schema: Schema.Struct({
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
    next_id: Schema.NullOr(Schema.Number),
    limit: Schema.optionalWith(Schema.Number, { default: () => 10 }),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    const workspaceSessionService = yield* WorkspaceSessionService

    /**
     * Retrieve the workspace identifier from the payload or the active workspace session.
     *
     * Priority is given to the payload's workspace_id if provided,
     * otherwise, it falls back to the active workspace session.
     */
    const workspaceIdentifier = yield* Match.value(payload.__qs.workspace_id).pipe(
      Match.when(Match.defined, id => Effect.succeed(WorkspaceIdentifier.make(id))),
      Match.orElse(() => workspaceSessionService.activeWorkspaceIdentifier),
    )

    return {
      workspace_identifier: workspaceIdentifier,
      next_id: payload.__qs.next_id ? Number(payload.__qs.next_id) : null,
      limit: Number(payload.__qs.limit) || 10,
    }
  }),
}) {}
