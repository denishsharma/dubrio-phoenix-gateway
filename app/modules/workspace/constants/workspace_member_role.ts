import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const WORKSPACE_MEMBER_ROLE = Enum({
  OWNER: 'owner',
  ADMIN: 'admin',
  AGENT: 'agent',
})

export type WorkspaceMemberRole = InferValue<typeof WORKSPACE_MEMBER_ROLE>
export const WorkspaceMemberRole = WORKSPACE_MEMBER_ROLE.accessor
