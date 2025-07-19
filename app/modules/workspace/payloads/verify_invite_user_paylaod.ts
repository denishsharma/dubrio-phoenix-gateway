import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import WorkspaceInvitationToken from '#modules/workspace/schemas/workspace_member/workspace_invitation_token'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class VerifyInviteUserPayload extends DataPayload('modules/workspace/verify_invite_user')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      __params: vine.object({
        token: vine.string(),
      }),
      __qs: vine.object({
        k: vine.string(),
      }),
    }),
  ),
  schema: Schema.Struct({
    token: SchemaFromSchemaAttribute(WorkspaceInvitationToken),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    const token = yield* WorkspaceInvitationToken.make({
      value: payload.__params.token,
      key: payload.__qs.k,
    })
    return { token }
  }),
}) {}
