import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import User from '#models/user_model'
import { WorkspaceMemberStatus } from '#modules/workspace/constants/workspace_member_status'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import { defaultTo } from 'lodash-es'
import { ulid } from 'ulid'

export default class Workspace extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare uid: string

  @column()
  declare name: string

  @column()
  declare website: string | null

  @column()
  declare logoUrl: string | null

  @column()
  declare industry: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @manyToMany(() => User, {
    pivotTable: 'workspace_members',
    pivotColumns: [
      'invited_by',
      'joined_at',
      'is_active',
      'status',
    ],
    pivotTimestamps: true,
  })
  declare members: ManyToMany<typeof User>

  @hasMany(() => User, {
    foreignKey: 'default_workspace_id',
  })
  declare usersWithDefaultWorkspace: HasMany<typeof User>

  @beforeCreate()
  static assignUniqueIdentifier(workspace: Workspace) {
    workspace.uid = defaultTo(workspace.uid, ulid())
  }

  static get workspaceMemberStatus() {
    return WorkspaceMemberStatus
  }
}
