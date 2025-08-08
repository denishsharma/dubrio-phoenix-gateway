import type { ContactAttributeDataType } from '#constants/contact_attribute_data_type'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { CamelCasedProperties, SnakeCasedProperties } from 'type-fest'
import Workspace from '#models/workspace_model'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'

export default class ContactAttribute extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

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
