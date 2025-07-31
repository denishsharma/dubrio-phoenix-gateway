import type { ContactAttributeDataType } from '#models/contact_attribute_model'
import ContactAttribute from '#models/contact_attribute_model'
import factory from '@adonisjs/lucid/factories'

export const ContactAttributeFactory = factory
  .define(ContactAttribute, async ({ faker }) => {
    const attributeTypes: ContactAttributeDataType[] = [
      'string',
      'number',
      'date',
      'boolean',
      'single_choice',
      'multiple_choice',
    ]
    const attributeNames = [
      'Contact Type',
      'Industry',
      'Company Size',
      'Lead Score',
      'Preferred Communication',
      'Interest Level',
      'Budget Range',
      'Decision Maker',
      'Location',
      'Source',
    ]

    return {
      name: faker.helpers.arrayElement(attributeNames),
      dataType: faker.helpers.arrayElement(attributeTypes),
      workspaceId: 1, // Default workspace
    }
  })
  .build()
