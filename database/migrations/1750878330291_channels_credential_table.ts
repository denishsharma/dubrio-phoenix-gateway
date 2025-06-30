import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'channels'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('user_id').unsigned().references('id').inTable('users')
      table.string('type').notNullable()
      table.string('phone_number_id').notNullable().unique()
      table.string('whatsapp_business_id').notNullable().unique()
      table.string('access_token').notNullable()
      table.string('verify_token').notNullable()
      table.string('graph_version').nullable().defaultTo(null)

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
