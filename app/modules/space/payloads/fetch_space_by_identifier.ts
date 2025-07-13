import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class FetchSpaceByIdentifier extends DataPayload('modules/space/fetch_space_by_identifier')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      __qs: vine.object({
        identifier: vine.string().trim(),
      }),
    }),
  ),
  schema: Schema.Struct({
    identifier: Schema.String,
  }),
  mapToSchema: payload => Effect.succeed({
    identifier: payload.__qs.identifier,
  }),
}) {}
