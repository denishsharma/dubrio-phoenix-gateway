import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import AccountVerificationToken from '#modules/iam/schemas/account/account_verification_token'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class VerifyAccountRequestPayload extends DataPayload('modules/iam/requests/account/verify_account_request')({
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
    token: SchemaFromSchemaAttribute(AccountVerificationToken),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    return {
      token: yield* AccountVerificationToken.make(payload.token),
    }
  }),
}) {}
