import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class ListSpaceMembersRequestPayload extends DataPayload('modules/space/payloads/request/list_space_members_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      __params: vine.object({
        spaceId: vine.string().trim().ulid(),
      }),
    }),
  ),
  schema: Schema.Struct({
    space_identifier: SchemaFromLucidModelIdentifier(SpaceIdentifier),
  }),
  mapToSchema: payload => Effect.succeed({
    space_identifier: SpaceIdentifier.make(payload.__params.spaceId),
  }),
}) {}
