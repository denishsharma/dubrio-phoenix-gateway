import { SchemaAttribute } from '#core/schema/factories/schema_attribute'
import { pipe, Schema } from 'effect'

export default class PasswordResetToken extends SchemaAttribute('modules/iam/authentication/password_reset_token')({
  marker: Symbol('@marker/modules/iam/authentication/password_reset_token'),
  schema: Schema.asSchema(
    pipe(
      Schema.Struct({
        value: Schema.String,
        key: Schema.String,
      }),
      Schema.annotations({
        identifier: 'PasswordResetToken',
        description: 'A token that contains a value and a key for resetting a password.',
        jsonSchema: {
          type: 'object',
          properties: {
            value: { type: 'string', description: 'The token value' },
            key: { type: 'string', description: 'The token key' },
          },
          required: ['value', 'key'],
          additionalProperties: false,
        },
      }),
    ),

  ),
}) {}
