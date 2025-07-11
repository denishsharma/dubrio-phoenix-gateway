import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

export default class SetActiveWorkspace extends DataPayload('modules/workspace/set_active_workspace')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      id: vine.string().ulid(),
    }),
  ),
  schema: Schema.Struct({
    id: Schema.ULID,
  }),
}) {}
