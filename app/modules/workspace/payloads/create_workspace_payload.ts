import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

export default class CreateWorkspacePayload extends DataPayload('modules/workspace/create_workspace')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      name: vine.string().minLength(1).maxLength(100),
      website: vine.string().optional(),
      logo: vine.string().optional(),
      industry: vine.string().optional(),
    }),
  ),
  schema: Schema.Struct({
    name: Schema.String,
    website: Schema.optional(Schema.String),
    logo: Schema.optional(Schema.String),
    industry: Schema.optional(Schema.String),
  }),
}) {}
