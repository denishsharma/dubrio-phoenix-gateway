import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import { PasswordResetToken } from '#modules/iam/schemas/authentication/authentication_attributes'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

export default class VerifyPasswordResetTokenPayload extends DataPayload('modules/iam/authentication/verify_password_reset_token')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      token: vine.object({
        value: vine.string(),
        key: vine.string(),
      }),
    }),
  ),
  schema: Schema.Struct({
    token: PasswordResetToken,
  }),
}) {}
