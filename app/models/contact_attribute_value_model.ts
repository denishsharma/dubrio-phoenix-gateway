import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { CamelCasedProperties, SnakeCasedProperties } from 'type-fest'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import ContactAttribute from './contact_attribute_model.js'
import ContactAttributeOption from './contact_attribute_option_model.js'
import Contact from './contact_model.js'

export default class ContactAttributeValue extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column()
  declare contactId: number

  @column()
  declare attributeId: number

  @column()
  declare optionId: number | null

  @column()
  declare valueText: string | null

  @column()
  declare valueNumber: number | null

  @column()
  declare valueBoolean: boolean | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ---------------------------
  // Relationships
  // ---------------------------

  @belongsTo(() => Contact)
  declare contact: BelongsTo<typeof Contact>

  @belongsTo(() => ContactAttribute, {
    foreignKey: 'attributeId',
  })
  declare attribute: BelongsTo<typeof ContactAttribute>

  @belongsTo(() => ContactAttributeOption, {
    foreignKey: 'optionId',
  })
  declare option: BelongsTo<typeof ContactAttributeOption>

  // ---------------------------
  // Computed Properties
  // ---------------------------

  get value(): string | number | boolean | null {
    if (this.valueText !== null) {
      return this.valueText
    }
    if (this.valueNumber !== null) {
      return this.valueNumber
    }
    if (this.valueBoolean !== null) {
      return this.valueBoolean
    }
    return null
  }

  setValue(value: string | number | boolean | null): void {
    // Reset all value fields
    this.valueText = null
    this.valueNumber = null
    this.valueBoolean = null

    // Set the appropriate field based on value type
    if (typeof value === 'string') {
      this.valueText = value
    } else if (typeof value === 'number') {
      this.valueNumber = value
    } else if (typeof value === 'boolean') {
      this.valueBoolean = value
    }
  }
}

/**
 * Type for the fields available in the ContactAttributeValue model.
 */
export type ContactAttributeValueModelFields = CamelCasedProperties<{
  id: ContactAttributeValue['id'];
  contactId: ContactAttributeValue['contactId'];
  attributeId: ContactAttributeValue['attributeId'];
  optionId: ContactAttributeValue['optionId'];
  valueText: ContactAttributeValue['valueText'];
  valueNumber: ContactAttributeValue['valueNumber'];
  valueBoolean: ContactAttributeValue['valueBoolean'];
  createdAt: ContactAttributeValue['createdAt'];
  updatedAt: ContactAttributeValue['updatedAt'];
}>

/**
 * Type for mapping the fields of the ContactAttributeValue model to snake_case
 */
export type ContactAttributeValueTableColumns = SnakeCasedProperties<ContactAttributeValueModelFields>
