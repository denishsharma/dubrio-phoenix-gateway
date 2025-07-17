import { SchemaAttribute } from '#core/schema/factories/schema_attribute'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import AccountVerificationToken from '#modules/iam/schemas/account/account_verification_token'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { Effect, ParseResult, Schema } from 'effect'

export default class AccountVerificationTokenDetailsSchema extends SchemaAttribute('modules/iam/account/account_verification_token_details')({
  marker: Symbol('@marker/modules/iam/account/account_verification_token_details'),
  schema: Schema.asSchema(
    Schema.Struct({
      user_identifier: SchemaFromLucidModelIdentifier(UserIdentifier),
      email_address: Schema.String,
      token: Schema.transformOrFail(
        AccountVerificationToken.schema,
        SchemaFromSchemaAttribute(AccountVerificationToken),
        {
          strict: true,
          decode: (value, _options, ast) => AccountVerificationToken.make(value).pipe(
            Effect.catchAll(() => ParseResult.fail(
              new ParseResult.Type(
                ast,
                value,
                'The provided token is not a valid account verification token.',
              ),
            )),
          ),
          encode: (token, _options, ast) => token.encoded().pipe(
            Effect.catchAll(() => ParseResult.fail(
              new ParseResult.Type(
                ast,
                token.value,
                'The provided token could not be encoded as an account verification token.',
              ),
            )),
          ),
        },
      ),
      duration: Schema.DurationFromSelf,
    }),
  ),
}) {}
