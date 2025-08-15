import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contact_attribute_values'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('contact_id').unsigned().references('id').inTable('contacts')
      table.integer('attribute_id').unsigned().notNullable().references('id').inTable('contact_attributes')
      table.integer('option_id').unsigned().nullable().references('id').inTable('contact_attribute_options')

      table.string('value_text', 500).nullable()
      table.decimal('value_number', 10, 2).nullable()
      table.boolean('value_boolean').nullable()

      table.index(['attribute_id', 'value_number'])
      table.index(['attribute_id', 'option_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()
    })

    // Create a prefixed index for text values (first 100 characters)
    this.schema.raw('CREATE INDEX contact_attr_values_text_idx ON contact_attribute_values (attribute_id, value_text(100))')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
