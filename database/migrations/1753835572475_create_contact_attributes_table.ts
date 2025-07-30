import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contact_attributes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('workspace_id').unsigned().notNullable()

      table.string('name').notNullable()
      table.enu('data_type', [
        'string',
        'number',
        'date',
        'boolean',
      ]).notNullable()

      table.unique(['workspace_id', 'name'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
