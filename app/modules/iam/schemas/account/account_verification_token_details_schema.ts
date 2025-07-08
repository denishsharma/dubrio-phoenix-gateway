import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { AccountVerificationToken } from '#modules/iam/schemas/account/account_attributes'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { Schema } from 'effect'

export default class AccountVerificationTokenDetails extends Schema.Class<AccountVerificationTokenDetails>('@schema/modules/iam/account/account_verification_token_details')({
  user_identifier: SchemaFromLucidModelIdentifier(UserIdentifier),
  email_address: Schema.String,
  token: Schema.typeSchema(AccountVerificationToken),
  duration: Schema.DurationFromSelf,
}) {}
