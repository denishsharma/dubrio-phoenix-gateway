import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Match, Schema } from 'effect'

export default class CreateSpaceRequestPayload extends DataPayload('modules/space/payloads/request/create_space_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      name: vine.string().minLength(1).maxLength(100),
      tag: vine.string().maxLength(50),
      icon: vine.string().optional(),
      __qs: vine.object({
        workspace_id: vine.string().trim().ulid().optional(),
      }),
    }),
  ),
  schema: Schema.Struct({
    name: Schema.String,
    tag: Schema.String,
    icon: Schema.optional(Schema.String),
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
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
      name: payload.name,
      tag: payload.tag,
      icon: payload.icon,
      workspace_identifier: workspaceIdentifier,
    }
  }),
}) {}
