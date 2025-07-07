import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
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
    token: Schema.Struct({
      value: Schema.String,
      key: Schema.String,
    }),
  }),
  mapToSchema: (payload) => {
    return Effect.sync(() => {
      return {
        token: {
          value: payload.__params.token,
          key: payload.__qs.k,
        },
      }
    })
  },
}) {}

// body
// param /$token
// queryString ? /$k
