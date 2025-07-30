import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contact_attribute_values'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('contact_id').unsigned().notNullable()
      table.integer('attribute_id').unsigned().notNullable()

      table.text('value_text').nullable()
      table.decimal('value_number', 10, 2).nullable()
      table.boolean('value_boolean').nullable()

      table
        .foreign('contact_id')
        .references('id')
        .inTable('contacts')
        .onDelete('CASCADE')

      table
        .foreign('attribute_id')
        .references('id')
        .inTable('contact_attributes')
        .onDelete('CASCADE')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
