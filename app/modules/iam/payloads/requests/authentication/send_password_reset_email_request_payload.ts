import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class SendPasswordResetEmailRequestPayload extends DataPayload('modules/iam/requests/authentication/send_password_reset_email_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      __qs: vine.object({
        email_address: vine.string().trim().normalizeEmail(),
      }),
    }),
  ),
  schema: Schema.Struct({
    email_address: Schema.NonEmptyTrimmedString,
  }),
  mapToSchema: payload => Effect.succeed({
    email_address: payload.__qs.email_address,
  }),
}) {}
