import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contact_attribute_values'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('contact_id').unsigned().notNullable()
      table.integer('attribute_id').unsigned().notNullable()
      table.integer('option_id').unsigned().nullable()

      table.string('value_text', 500).nullable()
      table.decimal('value_number', 10, 2).nullable()
      table.boolean('value_boolean').nullable()

      table.index(['attribute_id', 'value_number'])
      table.index(['attribute_id', 'option_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // Create a prefixed index for text values (first 100 characters)
    this.schema.raw('CREATE INDEX contact_attr_values_text_idx ON contact_attribute_values (attribute_id, value_text(100))')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
