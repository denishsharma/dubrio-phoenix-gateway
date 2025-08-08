import type { CommandOptions } from '@adonisjs/core/types/ace'
import ContactAttribute from '#models/contact_attribute_model'
import { BaseCommand } from '@adonisjs/core/ace'

export default class CheckSlugs extends BaseCommand {
  static commandName = 'check:slugs'
  static description = 'Check contact attribute slugs'

  static options: CommandOptions = {}

  async run() {
    try {
      const attributes = await ContactAttribute.query().select('name', 'slug').limit(10)
      this.logger.info('Contact Attributes with Slugs:')

      attributes.forEach((attr) => {
        this.logger.info(`Name: "${attr.name}" -> Slug: "${attr.slug}"`)
      })
    } catch (error) {
      this.logger.error('Error:', error.message)
    }
  }
}
