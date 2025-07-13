import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

const PUT_VALIDATION_SCHEMA = {
  mode: vine.literal('put'),
  identifier: vine.string().trim(),
  name: vine.string().trim().minLength(3).maxLength(64),
  tag: vine.string().trim().maxLength(64),
  avatarUrl: vine.string().trim().optional(),
}

const PATCH_VALIDATION_SCHEMA = {
  mode: vine.literal('patch'),
  identifier: vine.string().trim(),
  data: vine.object({
    name: vine.string().trim().minLength(2).optional(),
    tag: vine.string().trim().minLength(2).optional(),
    avatarUrl: vine.string().url().optional(),
  }),
}

const UPDATE_SPACE_VALIDATION = vine.group([
  vine.group.if(d => d.mode === 'put', PUT_VALIDATION_SCHEMA),
  vine.group.if(d => d.mode === 'patch', PATCH_VALIDATION_SCHEMA),
])

export default class UpdateSpacePayload extends DataPayload('modules/space/update_space')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      mode: vine.enum(['put', 'patch']),
      identifier: vine.string().trim(),
    }).merge(UPDATE_SPACE_VALIDATION),
  ),

  schema: Schema.Union(
    Schema.Struct({
      mode: Schema.Literal('put'),
      identifier: Schema.String,
      name: Schema.String,
      tag: Schema.String,
      avatarUrl: Schema.optional(Schema.String),
    }),
    Schema.Struct({
      mode: Schema.Literal('patch'),
      identifier: Schema.String,
      data: Schema.partial(
        Schema.Struct({
          name: Schema.String,
          tag: Schema.String,
          avatarUrl: Schema.String,
        }),
      ),
    }),
  ),
}) {}
