import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Match, Schema } from 'effect'

export default class SendWorkspaceInviteEmailRequestPayload extends DataPayload('modules/workspace/send_workspace_invite_email_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      invitees: vine.array(
        vine.object({
          first_name: vine.string().trim().optional().nullable(),
          last_name: vine.string().trim().optional().nullable(),
          email_address: vine.string().normalizeEmail(),
          space_identifier: vine.string().ulid().optional().nullable(),
        }),
      ),
      spaceId: vine.string().ulid(),
      __qs: vine.object({
        workspaceId: vine.string().ulid(),
      }),
    }),
  ),
  schema: Schema.Struct({
    invitees: Schema.ArrayEnsure(
      Schema.Struct({
        first_name: Schema.optionalWith(Schema.NonEmptyTrimmedString, { nullable: true }),
        last_name: Schema.optionalWith(Schema.NonEmptyTrimmedString, { nullable: true }),
        email_address: Schema.NonEmptyTrimmedString,
        space_identifier: Schema.optionalWith(SchemaFromLucidModelIdentifier(SpaceIdentifier), { nullable: true }),
      }),
    ),
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

    // Map invitees (object[]) to the richer structure expected downstream
    const invitees = payload.invitees.map(invitee => ({
      first_name: invitee.first_name ?? null,
      last_name: invitee.last_name ?? null,
      email_address: invitee.email_address,
      space_identifier: invitee.space_identifier ? SpaceIdentifier.make(invitee.space_identifier) : null,
    }))

    return {
      invitees,
      workspace_identifier: workspaceIdentifier,
    }
  }),
}) {}
