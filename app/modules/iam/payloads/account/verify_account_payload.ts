import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import { AccountVerificationToken } from '#modules/iam/schemas/account/account_attributes'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

export default class VerifyAccountPayload extends DataPayload('modules/iam/account/verify_account')({
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
    token: AccountVerificationToken,
  }),
}) {}
