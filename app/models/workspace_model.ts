import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { CamelCasedProperties, SnakeCasedProperties } from 'type-fest'
import { DatabaseTableName } from '#constants/database/database_table_name'
import LucidUtilityService from '#core/lucid/services/lucid_utility_service'
import Space from '#models/space_model'
import User from '#models/user_model'
import { compose } from '@adonisjs/core/helpers'
import stringHelpers from '@adonisjs/core/helpers/string'
import { BaseModel, beforeCreate, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import { Effect } from 'effect'
import { defaultTo } from 'lodash-es'

export default class Workspace extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare uid: string

  @column()
  declare name: string

  @column()
  declare slug: string

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

  // ---------------------------
  // Relationships
  // ---------------------------

  @manyToMany(() => User, {
    pivotTable: DatabaseTableName.WORKSPACE_MEMBERS,
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

  @hasMany(() => Space)
  declare spaces: HasMany<typeof Space>

  // ---------------------------
  // Hooks
  // ---------------------------

  /**
   * Assigns a unique identifier to the workspace if not provided.
   * This is done using the LucidUtilityService to generate a unique identifier.
   */
  @beforeCreate()
  static assignIdentifier(workspace: Workspace) {
    Effect.runSync(
      Effect.gen(function* () {
        const lucidUtility = yield* LucidUtilityService
        workspace.uid = defaultTo(workspace.uid, yield* lucidUtility.generateIdentifier)
      }).pipe(Effect.provide(LucidUtilityService.Default)),
    )
  }

  /**
   * Assigns a slug to the workspace based on its name.
   * If the slug is not provided, it will be generated from the name.
   */
  @beforeCreate()
  static assignSlug(workspace: Workspace) {
    workspace.slug = defaultTo(workspace.slug, stringHelpers.slug(workspace.name))
  }
}

/**
 * Type for the fields available in the Workspace model.
 *
 * This is used to define the fields that are available
 * in the Workspace model and to ensure that the
 * fields are correctly typed.
 */
export type WorkspaceModelFields = CamelCasedProperties<{
  id: Workspace['id'];
  uid: Workspace['uid'];
  name: Workspace['name'];
  slug: Workspace['slug'];
  website: Workspace['website'];
  logoUrl: Workspace['logoUrl'];
  industry: Workspace['industry'];
  createdAt: Workspace['createdAt'];
  updatedAt: Workspace['updatedAt'];
  deletedAt: Workspace['deletedAt'];
}>

/**
 * Type for mapping the fields of the Workspace model to snake_case
 * helping with the database column names.
 *
 * This is used to ensure that the fields are correctly
 * mapped to the database column names
 */
export type WorkspaceTableColumns = SnakeCasedProperties<WorkspaceModelFields>
