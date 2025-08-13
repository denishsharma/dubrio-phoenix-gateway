import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contact_attributes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('workspace_id').unsigned().references('id').inTable('workspaces')

      table.string('name')
      table.string('slug')
      table.string('data_type')

      table.boolean('is_default').defaultTo(false)
      table.boolean('is_required').defaultTo(false)
      table.boolean('is_unique').defaultTo(false)
      table.string('default_field_mapping').nullable()

      table.unique(['workspace_id', 'slug'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
