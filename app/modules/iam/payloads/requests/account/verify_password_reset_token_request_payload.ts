import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import PasswordResetToken from '#modules/iam/schemas/authentication/password_reset_token'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class VerifyPasswordResetTokenRequestPayload extends DataPayload('modules/iam/requests/account/verify_password_reset_token_request')({
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
    token: SchemaFromSchemaAttribute(PasswordResetToken),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    return {
      token: yield* PasswordResetToken.make(payload.token),
    }
  }),
}) {}
