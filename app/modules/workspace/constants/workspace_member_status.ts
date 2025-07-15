import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

// TODO: remove suspended status and pending activation status
export const WORKSPACE_MEMBER_STATUS = Enum({
  INVITATION_PENDING: 'invitation_pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING_ACTIVATION: 'pending_activation',
})

export type WorkspaceMemberStatus = InferValue<typeof WORKSPACE_MEMBER_STATUS>
export const WorkspaceMemberStatus = WORKSPACE_MEMBER_STATUS.accessor
