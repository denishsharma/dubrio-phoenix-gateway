import { Schema } from 'effect'

export interface AcceptInvitePayload {
  token: string;
  key: string;
}

export const AcceptInvitePayloadSchema = Schema.Struct({
  token: Schema.String,
  key: Schema.String,
})

export default AcceptInvitePayload
