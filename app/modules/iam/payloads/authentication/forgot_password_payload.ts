import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

export default class ForgotPasswordPayload extends DataPayload('modules/iam/authentication/forgot_password')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      email_address: vine.string().trim().email(),
    }),
  ),
  schema: Schema.Struct({
    email_address: Schema.NonEmptyTrimmedString,
  }),
}) {}
