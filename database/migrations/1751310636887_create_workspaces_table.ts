import { DatabaseTableName } from '#constants/database/database_table_name'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = DatabaseTableName.WORKSPACES

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('uid').unique()

      table.string('name')
      table.string('slug').unique()
      table.string('website').nullable()
      table.string('logo_url').nullable()
      table.string('industry').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
