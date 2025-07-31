import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { CamelCasedProperties, SnakeCasedProperties } from 'type-fest'
import LucidUtilityService from '#core/lucid/services/lucid_utility_service'
import Workspace from '#models/workspace_model'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import { Effect } from 'effect'
import { defaultTo } from 'lodash-es'

export default class Contact extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare uid: string

  @column()
  declare workspaceId: number

  @column()
  declare firstName: string | null

  @column()
  declare lastName: string | null

  @column()
  declare email: string | null

  @column()
  declare phoneNumber: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ---------------------------
  // Relationships
  // ---------------------------

  @belongsTo(() => Workspace)
  declare workspace: BelongsTo<typeof Workspace>

  // ---------------------------
  // Hooks
  // ---------------------------

  @beforeCreate()
  static assignIdentifier(contact: Contact) {
    Effect.runSync(
      Effect.gen(function* () {
        const lucidUtility = yield* LucidUtilityService
        contact.uid = defaultTo(contact.uid, yield* lucidUtility.generateIdentifier)
      }).pipe(Effect.provide(LucidUtilityService.Default)),
    )
  }
}

/**
 * Type for the fields available in the Contact model.
 */
export type ContactModelFields = CamelCasedProperties<{
  id: Contact['id'];
  uid: Contact['uid'];
  workspaceId: Contact['workspaceId'];
  firstName: Contact['firstName'];
  lastName: Contact['lastName'];
  email: Contact['email'];
  phoneNumber: Contact['phoneNumber'];
  createdAt: Contact['createdAt'];
  updatedAt: Contact['updatedAt'];
  deletedAt: Contact['deletedAt'];
}>

/**
 * Type for mapping the fields of the Contact model to snake_case
 */
export type ContactTableColumns = SnakeCasedProperties<ContactModelFields>
