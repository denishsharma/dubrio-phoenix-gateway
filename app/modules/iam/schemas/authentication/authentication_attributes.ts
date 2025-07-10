import { pipe, Schema } from 'effect'

/**
 * Schema that represents a password reset token which
 * is branded with a specific identifier.
 */
export const PasswordResetToken = Schema.asSchema(
  pipe(
    Schema.Struct({
      value: Schema.String,
      key: Schema.String,
    }),
    Schema.brand('@branded/modules/iam/password_reset_token'),
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
)
export type PasswordResetToken = typeof PasswordResetToken.Type
