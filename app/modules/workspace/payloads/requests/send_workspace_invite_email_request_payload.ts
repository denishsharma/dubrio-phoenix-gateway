import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Match, Schema } from 'effect'

export default class SendWorkspaceInviteEmailRequestPayload extends DataPayload('modules/workspace/send_workspace_invite_email_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      invitees: vine.array(vine.string().normalizeEmail()),
      __qs: vine.object({
        workspaceId: vine.string().ulid(),
      }),
    }),
  ),
  schema: Schema.Struct({
    invitees: Schema.Array(Schema.String),
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    const workspaceSessionService = yield* WorkspaceSessionService
    /**
     * Retrieve the workspace identifier from the payload or the active workspace session.
     * Priority is given to the payload's workspaceId if provided,
     * otherwise, it falls back to the active workspace session.
     */
    const workspaceIdentifier = yield* Match.value(payload.__qs.workspaceId).pipe(
      Match.when(Match.defined, id => Effect.succeed(WorkspaceIdentifier.make(id))),
      Match.orElse(() => workspaceSessionService.activeWorkspaceIdentifier),
    )

    return {
      invitees: payload.invitees,
      workspace_identifier: workspaceIdentifier,
    }
  }),
}) {}
