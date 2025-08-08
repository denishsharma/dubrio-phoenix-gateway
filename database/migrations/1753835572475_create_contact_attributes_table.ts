import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contact_attributes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('workspace_id').unsigned().references('id').inTable('workspaces')

      table.string('name').notNullable()
      table.string('slug').notNullable()
      table.string('data_type').notNullable()

      table.boolean('is_default').defaultTo(false)
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
