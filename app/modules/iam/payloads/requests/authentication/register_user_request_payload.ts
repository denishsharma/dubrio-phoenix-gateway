import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

export default class RegisterUserRequestPayload extends DataPayload('modules/iam/requests/authentication/register_user_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      email_address: vine.string().trim().normalizeEmail(),
      password: vine.string().trim().minLength(8).maxLength(64).confirmed({
        confirmationField: 'confirm_password',
      }),
      first_name: vine.string().trim().minLength(3),
      last_name: vine.string().trim().optional(),
    }),
  ),
  schema: Schema.Struct({
    email_address: Schema.NonEmptyTrimmedString,
    password: Schema.Redacted(Schema.NonEmptyTrimmedString),
    first_name: Schema.NonEmptyTrimmedString,
    last_name: Schema.NonEmptyTrimmedString,
  }),
}) {}
