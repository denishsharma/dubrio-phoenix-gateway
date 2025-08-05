import ContactAttribute from '#models/contact_attribute_model'
import ContactAttributeValue from '#models/contact_attribute_value_model'
import Contact from '#models/contact_model'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Get all contacts and default attributes
    const contacts = await Contact.all()
    const defaultAttributes = await ContactAttribute
      .query()
      .where('isDefault', true)
      .whereNotNull('defaultFieldMapping')

    if (contacts.length === 0 || defaultAttributes.length === 0) {
      // No logging needed in seeder - just return
      return
    }

    for (const contact of contacts) {
      for (const attribute of defaultAttributes) {
        // Check if attribute value already exists to avoid duplicates
        const existingValue = await ContactAttributeValue
          .query()
          .where('contactId', contact.id)
          .where('attributeId', attribute.id)
          .first()

        if (existingValue) {
          continue // Skip if value already exists
        }

        let contactFieldValue: string | null = null

        // Map the default field to contact model field
        switch (attribute.defaultFieldMapping) {
          case 'first_name':
            contactFieldValue = contact.firstName
            break
          case 'last_name':
            contactFieldValue = contact.lastName
            break
          case 'email':
            contactFieldValue = contact.email
            break
          case 'phone_number':
            contactFieldValue = contact.phoneNumber
            break
          default:
            continue // Skip unknown mappings
        }

        // Only create attribute value if the contact field has a value
        if (contactFieldValue) {
          await ContactAttributeValue.create({
            contactId: contact.id,
            attributeId: attribute.id,
            optionId: null,
            valueText: contactFieldValue,
            valueNumber: null,
            valueBoolean: null,
          })
        }
      }
    }

    // Seeder completed successfully
  }
}
