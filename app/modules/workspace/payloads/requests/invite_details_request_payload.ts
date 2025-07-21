import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import WorkspaceInvitationToken from '#modules/workspace/schemas/workspace_member/workspace_invitation_token'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class InviteDetailsRequestPayload extends DataPayload('modules/workspace/requests/invite_details_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      token: vine.object({
        value: vine.string(),
        key: vine.string(),
      }),
    }),
  ),
  schema: Schema.Struct({
    token: SchemaFromSchemaAttribute(WorkspaceInvitationToken),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    const token = yield* WorkspaceInvitationToken.make(payload.token)
    return { token }
  }),
}) {}
