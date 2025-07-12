import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

export default class CreateSpacePayload extends DataPayload('modules/space/create_workspace')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      name: vine.string().minLength(1).maxLength(100),
      tag: vine.string().maxLength(50),
      avatar_url: vine.string().optional(),
    }),
  ),
  schema: Schema.Struct({
    name: Schema.String,
    tag: Schema.String,
    avatar_url: Schema.optional(Schema.String),
  }),
}) {}
