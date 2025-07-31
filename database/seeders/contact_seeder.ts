import { ContactFactory } from '#database/factories/contact_factory'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    await ContactFactory.createMany(10)
  }
}
