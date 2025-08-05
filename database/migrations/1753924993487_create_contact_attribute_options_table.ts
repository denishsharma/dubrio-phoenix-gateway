import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contact_attribute_options'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('contact_attribute_id').unsigned().notNullable()

      table.string('option_value').notNullable()
      table.string('option_label').notNullable()
      table.integer('sort_order').defaultTo(0)

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.unique(['contact_attribute_id', 'option_value'], 'contact_attr_opt_unique')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
