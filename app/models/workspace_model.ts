import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import User from '#models/user_model'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, column, manyToMany } from '@adonisjs/lucid/orm'
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
    pivotColumns: ['invited_by', 'joined_at'],
    pivotTimestamps: true,
  })
  declare users: ManyToMany<typeof User>

  @beforeCreate()
  static assignUniqueIdentifier(workspace: Workspace) {
    workspace.uid = defaultTo(workspace.uid, ulid())
  }
}
