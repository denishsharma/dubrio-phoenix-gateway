import type { Duration } from 'effect'
import { Schema } from 'effect'

export interface InviteExistingUserPayload {
  user_id: string;
  workspace_id: string;
  inviter_id: string;
  email: string;
  duration: Duration.Duration;
}

export const InviteExistingUserPayloadSchema = Schema.Struct({
  user_id: Schema.ULID,
  workspace_id: Schema.ULID,
  inviter_id: Schema.ULID,
  email: Schema.String,
  duration: Schema.Any,
})

export default InviteExistingUserPayload
