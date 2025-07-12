import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { CamelCasedProperties, SnakeCasedProperties } from 'type-fest'
import LucidUtilityService from '#core/lucid/services/lucid_utility_service'
import User from '#models/user_model'
import Workspace from '#models/workspace_model'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import { Effect } from 'effect'
import { defaultTo } from 'lodash-es'

export default class Space extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare uid: string

  @column()
  declare name: string

  @column()
  declare tag: string

  @column()
  declare avatarUrl: string | null

  @column()
  declare workspaceId: number

  @column()
  declare createdBy: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ---------------------------
  // Relationships
  // ---------------------------

  /**
   * Many-to-many relationship with Users.
   * This relationship allows us to fetch all members of a space.
   * The pivot table is 'space_members' and includes additional fields like 'role', 'is_active', 'invited_by', and 'joined_at'.
   */
  @manyToMany(() => User, {
    pivotTable: 'space_members',
    pivotTimestamps: true,
  })
  declare members: ManyToMany<typeof User>

  @belongsTo(() => Workspace)
  declare workspace: BelongsTo<typeof Workspace>

  // ---------------------------
  // Hooks
  // ---------------------------

  @beforeCreate()
  static assignIdentifier(space: Space) {
    Effect.runSync(
      Effect.gen(function* () {
        const lucidUtility = yield* LucidUtilityService
        space.uid = defaultTo(space.uid, yield* lucidUtility.generateIdentifier)
      }).pipe(Effect.provide(LucidUtilityService.Default)),
    )
  }
}

/**
 * Type for the fields available in the Space model.
 *
 * This is used to define the fields that are available
 * in the Space model and to ensure that the
 * fields are correctly typed.
 */
export type SpaceModelFields = CamelCasedProperties<{
  id: Space['id'];
  uid: Space['uid'];
  name: Space['name'];
  tag: Space['tag'];
  avatarUrl: Space['avatarUrl'];
  workspaceId: Space['workspaceId'];
  createdBy: Space['createdBy'];
  createdAt: Space['createdAt'];
  updatedAt: Space['updatedAt'];
  deletedAt: Space['deletedAt'];
}>

/**
 * Type for mapping the fields of the Space model to snake_case
 * helping with the database column names.
 *
 * This is used to ensure that the fields are correctly
 * mapped to the database column names
 */
export type SpaceTableColumns = SnakeCasedProperties<SpaceModelFields>
