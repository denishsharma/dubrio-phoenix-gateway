import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const DATABASE_TABLE_NAME = Enum({
  USERS: 'users',
  WORKSPACES: 'workspaces',
  WORKSPACE_MEMBERS: 'workspace_members',
})

export type DatabaseTableName = InferValue<typeof DATABASE_TABLE_NAME>
export const DatabaseTableName = DATABASE_TABLE_NAME.accessor
