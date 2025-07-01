import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'whatsapp_channel_configurations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('uid').unique()

      table.integer('workspace_id').unsigned().references('id').inTable('workspaces')
      table.string('name')
      table.string('phone_number_id')
      table.string('whatsapp_business_id')
      table.string('access_token')
      table.string('verify_token')
      table.string('graph_version').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
