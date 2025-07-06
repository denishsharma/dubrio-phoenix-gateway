import type { Duration } from 'effect'
import { Schema } from 'effect'

export interface InviteNewUserPayload {
  email: string;
  first_name: string;
  workspace_id: string;
  inviter_id: string;
  duration: Duration.Duration;
}

export const InviteNewUserPayloadSchema = Schema.Struct({
  email: Schema.String,
  first_name: Schema.String,
  workspace_id: Schema.ULID,
  inviter_id: Schema.ULID,
  duration: Schema.Any,
})

export default InviteNewUserPayload
