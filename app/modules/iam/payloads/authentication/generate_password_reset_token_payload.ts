import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { Schema } from 'effect'

export default class GeneratePasswordResetTokenPayload extends DataPayload('modules/iam/authentication/generate_password_reset_token')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    user_identifier: SchemaFromLucidModelIdentifier(UserIdentifier),
    duration: Schema.DurationFromSelf,
  }),
}) {}
