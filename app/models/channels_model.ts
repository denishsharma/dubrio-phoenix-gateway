import type { ChannelType } from '#constants/channel_type'
import type { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Channels extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare type: ChannelType

  @column()
  declare phoneNumberId: string

  @column()
  declare whatsappBusinessId: string

  @column()
  declare accessToken: string

  @column()
  declare verifyToken: string

  @column()
  declare graphVersion?: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
