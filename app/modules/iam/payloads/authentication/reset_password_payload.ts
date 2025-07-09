import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

export default class ResetPasswordPayload extends DataPayload('modules/iam/authentication/reset_password')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      token: vine.string().trim(),
      key: vine.string().trim(),
      password: vine.string().trim().minLength(8).confirmed({
        confirmationField: 'confirm_password',
      }),
    }),
  ),
  schema: Schema.Struct({
    token: Schema.NonEmptyTrimmedString,
    key: Schema.NonEmptyTrimmedString,
    password: Schema.Redacted(Schema.NonEmptyTrimmedString),
  }),
}) {}
