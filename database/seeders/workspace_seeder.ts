import { WorkspaceFactory } from '#database/factories/workspace_factory'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Create at least one workspace for other seeders to reference
    await WorkspaceFactory.createMany(3)
  }
}
