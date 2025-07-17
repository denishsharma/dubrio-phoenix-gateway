import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import PasswordResetToken from '#modules/iam/schemas/authentication/password_reset_token'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { Schema } from 'effect'

export default class ResetPasswordPayload extends DataPayload('modules/iam/authentication/reset_password_payload')({
  kind: DataPayloadKind.DATA,
  schema: Schema.extend(
    Schema.Struct({
      password: Schema.Redacted(Schema.NonEmptyTrimmedString),
    }),
    Schema.Union(
      Schema.Struct({
        mode: Schema.Literal('direct'),
        user_identifier: SchemaFromLucidModelIdentifier(UserIdentifier),
      }),
      Schema.Struct({
        mode: Schema.Literal('token'),
        token: SchemaFromSchemaAttribute(PasswordResetToken),
      }),
    ),
  ),
}) {}
