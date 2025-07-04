import { Schema } from 'effect'

export default class GenerateAccountVerificationTokenDetailPayload extends Schema.Class<GenerateAccountVerificationTokenDetailPayload>('@payload/modules/iam/account_verification/generate_account_verification_token_detail_payl')({
  user_identifier: Schema.ULID,
  email: Schema.String,
  duration: Schema.DurationFromSelf,
}) {}
