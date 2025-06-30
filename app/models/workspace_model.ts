import type { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Workspace extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare workspaceName: string

  @column()
  declare website: string

  @column()
  declare logo: string

  @column()
  declare industry: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
