import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { CamelCasedProperties, SnakeCasedProperties } from 'type-fest'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import ContactAttribute from './contact_attribute_model.js'

export default class ContactAttributeOption extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column()
  declare contactAttributeId: number

  @column()
  declare optionValue: string

  @column()
  declare optionLabel: string

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ---------------------------
  // Relationships
  // ---------------------------

  @belongsTo(() => ContactAttribute, {
    foreignKey: 'contactAttributeId',
  })
  declare contactAttribute: BelongsTo<typeof ContactAttribute>
}

/**
 * Type for the fields available in the ContactAttributeOption model.
 */
export type ContactAttributeOptionModelFields = CamelCasedProperties<{
  id: ContactAttributeOption['id'];
  contactAttributeId: ContactAttributeOption['contactAttributeId'];
  optionValue: ContactAttributeOption['optionValue'];
  optionLabel: ContactAttributeOption['optionLabel'];
  sortOrder: ContactAttributeOption['sortOrder'];
  createdAt: ContactAttributeOption['createdAt'];
  updatedAt: ContactAttributeOption['updatedAt'];
}>

/**
 * Type for mapping the fields of the ContactAttributeOption model to snake_case
 */
export type ContactAttributeOptionTableColumns = SnakeCasedProperties<ContactAttributeOptionModelFields>
