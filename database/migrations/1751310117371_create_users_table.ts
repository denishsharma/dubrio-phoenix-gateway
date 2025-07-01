import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('uid').unique()

      table.string('first_name')
      table.string('last_name').nullable()
      table.string('email', 254).unique().nullable()
      table.string('password').nullable()

      table.boolean('is_verified').defaultTo(false)
      table.string('onboarding_status').defaultTo(OnboardingStatus.NOT_STARTED)

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
