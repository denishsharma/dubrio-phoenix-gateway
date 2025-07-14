import { DatabaseTableName } from '#constants/database/database_table_name'
import { WorkspaceMemberRole } from '#modules/workspace/constants/workspace_member_role'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = DatabaseTableName.WORKSPACE_MEMBERS

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('user_id').unsigned().references('id').inTable('users')
      table.integer('workspace_id').unsigned().references('id').inTable('workspaces')

      table.integer('invited_by').unsigned().nullable().references('id').inTable('users')
      table.timestamp('joined_at').nullable()

      table.string('role').defaultTo(WorkspaceMemberRole.ADMIN)
      table.boolean('is_active').defaultTo(false)
      table.string('status')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
