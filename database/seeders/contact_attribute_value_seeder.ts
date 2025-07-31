import ContactAttribute from '#models/contact_attribute_model'
import ContactAttributeOption from '#models/contact_attribute_option_model'
import ContactAttributeValue from '#models/contact_attribute_value_model'
import Contact from '#models/contact_model'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Get all contacts and attributes to create sample values
    const contacts = await Contact.all()
    const attributes = await ContactAttribute.all()

    if (contacts.length === 0 || attributes.length === 0) {
      // No logging needed in seeder
      return
    }

    for (const contact of contacts) {
      for (const attribute of attributes) {
        // Skip some attributes randomly to create realistic data
        if (Math.random() < 0.3) {
          continue
        }

        let attributeValue: ContactAttributeValue | undefined

        switch (attribute.dataType) {
          case 'string': {
            attributeValue = new ContactAttributeValue()
            attributeValue.contactId = contact.id
            attributeValue.attributeId = attribute.id
            attributeValue.valueText = this.getRandomStringValue(attribute.name)
            break
          }

          case 'number': {
            attributeValue = new ContactAttributeValue()
            attributeValue.contactId = contact.id
            attributeValue.attributeId = attribute.id
            attributeValue.valueNumber = this.getRandomNumberValue(attribute.name)
            break
          }

          case 'boolean': {
            attributeValue = new ContactAttributeValue()
            attributeValue.contactId = contact.id
            attributeValue.attributeId = attribute.id
            attributeValue.valueBoolean = Math.random() > 0.5
            break
          }

          case 'date': {
            attributeValue = new ContactAttributeValue()
            attributeValue.contactId = contact.id
            attributeValue.attributeId = attribute.id
            // Store date as string for simplicity
            attributeValue.valueText = this.getRandomDateValue()
            break
          }

          case 'single_choice': {
            // Get options for this attribute
            const options = await ContactAttributeOption
              .query()
              .where('contactAttributeId', attribute.id)

            if (options.length > 0) {
              const randomOption = options[Math.floor(Math.random() * options.length)]
              attributeValue = new ContactAttributeValue()
              attributeValue.contactId = contact.id
              attributeValue.attributeId = attribute.id
              attributeValue.optionId = randomOption.id
              attributeValue.valueText = randomOption.optionValue
            }
            break
          }

          case 'multiple_choice': {
            // Get options for this attribute
            const options = await ContactAttributeOption
              .query()
              .where('contactAttributeId', attribute.id)

            if (options.length > 0) {
              const selectedOptions = options
                .filter(() => Math.random() > 0.5)
                .slice(0, Math.floor(Math.random() * 3) + 1) // Select 1-3 options

              if (selectedOptions.length > 0) {
                // For simplicity, store as comma-separated values
                const optionValues = selectedOptions.map((opt: ContactAttributeOption) => opt.optionValue).join(',')

                attributeValue = new ContactAttributeValue()
                attributeValue.contactId = contact.id
                attributeValue.attributeId = attribute.id
                attributeValue.valueText = optionValues
                // For multiple choice, we'll store the first option ID
                attributeValue.optionId = selectedOptions[0].id
              }
            }
            break
          }
        }

        if (attributeValue) {
          await attributeValue.save()
        }
      }
    }
  }

  private getRandomStringValue(attributeName: string): string {
    const stringValues: Record<string, string[]> = {
      Notes: [
        'Very interested in our product',
        'Needs follow-up in Q2',
        'Budget approved for next quarter',
        'Prefers email communication',
        'Attended our webinar last month',
        'Referenced by existing customer',
        'Looking for enterprise solution',
        'Price sensitive customer',
      ],
      default: [
        'Sample text value',
        'Another example',
        'Custom data entry',
        'User provided information',
      ],
    }

    const values = stringValues[attributeName] || stringValues.default
    return values[Math.floor(Math.random() * values.length)]
  }

  private getRandomNumberValue(attributeName: string): number {
    const numberRanges: Record<string, { min: number; max: number }> = {
      'Lead Score': { min: 0, max: 100 },
      'default': { min: 1, max: 100 },
    }

    const range = numberRanges[attributeName] || numberRanges.default
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
  }

  private getRandomDateValue(): string {
    const now = new Date()
    const pastDays = Math.floor(Math.random() * 365) // Random date in the past year
    const randomDate = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000)
    return randomDate.toISOString().split('T')[0] // Return YYYY-MM-DD format
  }
}
