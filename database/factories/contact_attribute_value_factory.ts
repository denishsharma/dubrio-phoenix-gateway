import ContactAttributeValue from '#models/contact_attribute_value_model'
import factory from '@adonisjs/lucid/factories'

export const ContactAttributeValueFactory = factory
  .define(ContactAttributeValue, async ({ faker }) => {
    const valueType = faker.helpers.arrayElement([
      'text',
      'number',
      'boolean',
    ])

    let valueText = null
    let valueNumber = null
    let valueBoolean = null

    switch (valueType) {
      case 'text':
        valueText = faker.helpers.arrayElement([
          'High Priority',
          'Medium Priority',
          'Low Priority',
          'Enterprise',
          'SMB',
          'Startup',
          'North America',
          'Europe',
          'Asia Pacific',
        ])
        break
      case 'number':
        valueNumber = faker.number.int({ min: 1, max: 100 })
        break
      case 'boolean':
        valueBoolean = faker.datatype.boolean()
        break
    }

    return {
      contactId: 1, // Will be overridden when creating with relations
      attributeId: 1, // Will be overridden when creating with relations
      optionId: null, // For choice types, this will be set appropriately
      valueText,
      valueNumber,
      valueBoolean,
    }
  })
  .build()
