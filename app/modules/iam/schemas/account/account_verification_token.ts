import { SchemaAttribute } from '#core/schema/factories/schema_attribute'
import { pipe, Schema } from 'effect'

export default class AccountVerificationToken extends SchemaAttribute('modules/iam/account/account_verification_token')({
  marker: Symbol('@marker/modules/iam/account/account_verification_token'),
  schema: Schema.asSchema(
    pipe(
      Schema.Struct({
        value: Schema.String,
        key: Schema.String,
      }),
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
  ),
}) {}
