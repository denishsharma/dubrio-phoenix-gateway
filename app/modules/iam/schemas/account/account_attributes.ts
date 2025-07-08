import { pipe, Schema } from 'effect'

/**
 * Schema that represents an account verification token which
 * is branded with a specific identifier.
 */
export const AccountVerificationToken = Schema.asSchema(
  pipe(
    Schema.Struct({
      value: Schema.String,
      key: Schema.String,
    }),
    Schema.brand('@branded/modules/iam/account/account_attributes/account_verification_token'),
    Schema.annotations({
      identifier: 'AccountVerificationToken',
      description: 'A token that contains a value and a key for account verification',
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
export type AccountVerificationToken = typeof AccountVerificationToken.Type
