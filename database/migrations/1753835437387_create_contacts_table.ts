import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contacts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('uid').unique()
      table.integer('workspace_id').unsigned().notNullable()

      table.string('first_name').nullable()
      table.string('last_name').nullable()
      table.string('email', 254).unique().nullable()
      table.string('phone_number').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
