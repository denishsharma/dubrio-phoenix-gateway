import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'
import { merge } from 'lodash-es'

const PUT_VALIDATION_SCHEMA = {
  mode: vine.literal('replace'),
  // identifier: vine.string().trim(),
  data: vine.object({
    name: vine.string().trim().minLength(3).maxLength(64),
    tag: vine.string().trim().maxLength(64),
    avatar_url: vine.string().trim().optional(),
  }),
}

const PATCH_VALIDATION_SCHEMA = {
  mode: vine.literal('partial'),
  // identifier: vine.string().trim(),
  data: vine.object({
    name: vine.string().trim().minLength(2).optional(),
    tag: vine.string().trim().minLength(2).optional(),
    avatar_url: vine.string().url().optional(),
  }),
}

const UPDATE_SPACE_VALIDATION = vine.group([
  vine.group.if(d => d.mode === 'replace', PUT_VALIDATION_SCHEMA),
  vine.group.if(d => d.mode === 'partial', PATCH_VALIDATION_SCHEMA),
])

export default class UpdateSpacePayload extends DataPayload('modules/space/update_space')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      mode: vine.enum(['replace', 'partial']),
      __params: vine.object({
        id: vine.string().trim().ulid(),
      }),
    }).merge(UPDATE_SPACE_VALIDATION),
  ),
  schema: Schema.extend(
    Schema.Struct({
      space_identifier: Schema.transform(
        Schema.ULID,
        SchemaFromLucidModelIdentifier(SpaceIdentifier),
        {
          strict: true,
          decode: value => SpaceIdentifier.make(value),
          encode: identifier => identifier.value,
        },
      ),
    }),
    Schema.Union(
      Schema.Struct({
        mode: Schema.Literal('replace'),
        data: Schema.Struct({
          name: Schema.String,
          tag: Schema.String,
          avatar_url: Schema.optional(Schema.NullOr(Schema.String)),
        }),
      }),
      Schema.Struct({
        mode: Schema.Literal('partial'),
        data: Schema.partial(
          Schema.Struct({
            name: Schema.String,
            tag: Schema.String,
            avatar_url: Schema.String,
          }),
        ),
      }),
    ),
  ),
  mapToSchema: payload => Effect.sync(() => {
    return merge(
      {},
      { space_identifier: payload.__params.id },
      payload.mode === 'replace'
        ? {
            mode: payload.mode,
            data: payload.data,
          }
        : {
            mode: payload.mode,
            data: payload.data,
          },
    )
  }),
}) {}
