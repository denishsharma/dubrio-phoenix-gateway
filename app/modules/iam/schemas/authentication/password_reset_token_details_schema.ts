import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { pipe, Schema } from 'effect'

export const PasswordResetToken = Schema.asSchema(
  pipe(
    Schema.Struct({
      value: Schema.String,
      key: Schema.String,
    }),
    Schema.brand('@branded/modules/iam/authentication/password_reset_token'),
    Schema.annotations({
      identifier: 'PasswordResetToken',
      description: 'A token that contains a value and a key for password reset',
      jsonSchema: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'The token value' },
          key: { type: 'string', description: 'The token key' },
        },
      },
    }),
  ),
)
export type PasswordResetToken = Schema.Schema.Type<typeof PasswordResetToken>

export default class PasswordResetTokenDetails extends Schema.Class<PasswordResetTokenDetails>('@schema/modules/iam/authentication/password_reset_token_details')({
  user_identifier: SchemaFromLucidModelIdentifier(UserIdentifier),
  email_address: Schema.String,
  token: Schema.typeSchema(PasswordResetToken),
  duration: Schema.DurationFromSelf,
}) {}
