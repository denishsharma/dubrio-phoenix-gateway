import { Schema } from 'effect'

export default class VerifyTokenPayload extends Schema.Class<VerifyTokenPayload>('@payload/modules/iam/account_verification/verify_token')({
  token: Schema.String,
  key: Schema.String,
}) {}
