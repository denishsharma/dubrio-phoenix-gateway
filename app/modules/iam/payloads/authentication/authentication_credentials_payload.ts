import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

export default class AuthenticationCredentialsPayload extends DataPayload('modules/iam/authentication/credentials')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      email_address: vine.string().trim(),
      password: vine.string().trim(),
    }),
  ),
  schema: Schema.Struct({
    email_address: Schema.NonEmptyTrimmedString,
    password: Schema.Redacted(Schema.NonEmptyTrimmedString),
  }),
}) {}
