import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const SPACE_ROLE = Enum({
  ADMIN: 'admin',
  MEMBER: 'member',
})

export type SpaceRole = InferValue<typeof SPACE_ROLE>
export const SpaceRole = SPACE_ROLE.accessor
export const SPACE_ROLES = [
  'admin',
  'member',
] as const
