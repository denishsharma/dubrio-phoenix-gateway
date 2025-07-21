import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class AddSpaceMemberRequestPayload extends DataPayload('modules/space/payloads/request/add_space_member_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      user_id: vine.string().trim().ulid(),
      __params: vine.object({
        spaceId: vine.string().trim().ulid(),
      }),
    }),
  ),
  schema: Schema.Struct({
    space_identifier: SchemaFromLucidModelIdentifier(SpaceIdentifier),
    user_identifier: SchemaFromLucidModelIdentifier(UserIdentifier),
  }),
  mapToSchema: payload => Effect.succeed({
    space_identifier: SpaceIdentifier.make(payload.__params.spaceId),
    user_identifier: UserIdentifier.make(payload.user_id),
  }),
}) {}
