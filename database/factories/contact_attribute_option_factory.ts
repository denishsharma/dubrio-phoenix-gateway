import ContactAttributeOption from '#models/contact_attribute_option_model'
import factory from '@adonisjs/lucid/factories'

export const ContactAttributeOptionFactory = factory
  .define(ContactAttributeOption, async ({ faker }) => {
    const optionSets = [
      // Contact Type options
      [
        { value: 'lead', label: 'Lead' },
        { value: 'prospect', label: 'Prospect' },
        { value: 'customer', label: 'Customer' },
        { value: 'partner', label: 'Partner' },
      ],
      // Communication Preference options
      [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' },
        { value: 'sms', label: 'SMS' },
        { value: 'linkedin', label: 'LinkedIn' },
      ],
      // Industry options
      [
        { value: 'technology', label: 'Technology' },
        { value: 'finance', label: 'Finance' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'retail', label: 'Retail' },
        { value: 'manufacturing', label: 'Manufacturing' },
      ],
    ]

    const selectedSet = faker.helpers.arrayElement(optionSets)
    const selectedOption = faker.helpers.arrayElement(selectedSet)

    return {
      contactAttributeId: 1, // Will be overridden when creating with relations
      optionValue: selectedOption.value,
      optionLabel: selectedOption.label,
      sortOrder: faker.number.int({ min: 0, max: 10 }),
    }
  })
  .build()
