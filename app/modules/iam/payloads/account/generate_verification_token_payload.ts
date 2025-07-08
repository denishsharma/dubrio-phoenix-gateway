import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { Schema } from 'effect'

export default class GenerateVerificationTokenPayload extends DataPayload('modules/iam/account/generate_verification_token')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    user: Schema.Struct({
      identifier: SchemaFromLucidModelIdentifier(UserIdentifier),
      email_address: Schema.String,
    }),
    duration: Schema.DurationFromSelf,
  }),
}) {}
