import { Schema } from 'effect'

export default class QueueVerificationEmailPayload extends Schema.Class<QueueVerificationEmailPayload>('@payload/modules/iam/account_verification/queue_verification_email')({
  user_identifier: Schema.ULID,
  email: Schema.String,
  duration: Schema.DurationFromSelf,
}) {}
