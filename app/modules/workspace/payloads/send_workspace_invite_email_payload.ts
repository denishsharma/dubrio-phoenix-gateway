import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

export default class SendWorkspaceInviteEmailPayload extends DataPayload('modules/workspace/send_workspace_invite_email') ({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      invitees: vine.array(vine.string().normalizeEmail()),
    }),
  ),
  schema: Schema.Struct({
    invitees: Schema.Array(Schema.String),
  }),
}) {}
