import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'spaces'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('uid').unique()

      table.string('name')
      table.string('tag')
      table.unique(['tag', 'workspace_id'])
      table.string('icon').nullable()

      table.integer('workspace_id').unsigned().references('id').inTable('workspaces')

      table.integer('created_by').unsigned().references('id').inTable('users')

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
