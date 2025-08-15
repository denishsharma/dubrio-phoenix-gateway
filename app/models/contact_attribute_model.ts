import type { ContactAttributeDataType } from '#constants/contact_attribute_data_type'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { CamelCasedProperties, SnakeCasedProperties } from 'type-fest'
import LucidUtilityService from '#core/lucid/services/lucid_utility_service'
import ContactAttributeOption from '#models/contact_attribute_option_model'
import Workspace from '#models/workspace_model'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import { Effect } from 'effect'
import { defaultTo } from 'lodash-es'

export default class ContactAttribute extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare uid: string

  @column()
  declare workspaceId: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare dataType: ContactAttributeDataType

  @column()
  declare isDefault: boolean

  @column()
  declare isRequired: boolean

  @column()
  declare isUnique: boolean

  @column()
  declare defaultFieldMapping: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ---------------------------
  // Relationships
  // ---------------------------

  @belongsTo(() => Workspace)
  declare workspace: BelongsTo<typeof Workspace>

  @hasMany(() => ContactAttributeOption, {
    foreignKey: 'contactAttributeId',
    localKey: 'id',
  })
  public options!: HasMany<typeof ContactAttributeOption>

  // ---------------------------
  // Hooks
  // ---------------------------

  @beforeCreate()
  static assignIdentifier(contactAttribute: ContactAttribute) {
    Effect.runSync(
      Effect.gen(function* () {
        const lucidUtility = yield* LucidUtilityService
        contactAttribute.uid = defaultTo(contactAttribute.uid, yield* lucidUtility.generateIdentifier)
      }).pipe(Effect.provide(LucidUtilityService.Default)),
    )
  }

  // ---------------------------
  // Computed Properties
  // ---------------------------

  get isChoiceType(): boolean {
    return this.dataType === 'single_choice' || this.dataType === 'multiple_choice'
  }

  get requiresOptions(): boolean {
    return this.isChoiceType
  }
}

/**
 * Type for the fields available in the ContactAttribute model.
 */
export type ContactAttributeModelFields = CamelCasedProperties<{
  id: ContactAttribute['id'];
  uid: ContactAttribute['uid'];
  workspaceId: ContactAttribute['workspaceId'];
  name: ContactAttribute['name'];
  dataType: ContactAttribute['dataType'];
  isDefault: ContactAttribute['isDefault'];
  defaultFieldMapping: ContactAttribute['defaultFieldMapping'];
  createdAt: ContactAttribute['createdAt'];
  updatedAt: ContactAttribute['updatedAt'];
}>

/**
 * Type for mapping the fields of the ContactAttribute model to snake_case
 */
export type ContactAttributeTableColumns = SnakeCasedProperties<ContactAttributeModelFields>
