import ContactAttribute from '#models/contact_attribute_model'
import ContactAttributeOption from '#models/contact_attribute_option_model'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Create default contact attributes that map to existing contact fields
    const defaultAttributes = [
      {
        name: 'First Name',
        dataType: 'string' as const,
        workspaceId: 1,
        isDefault: true,
        defaultFieldMapping: 'first_name',
        options: [],
      },
      {
        name: 'Last Name',
        dataType: 'string' as const,
        workspaceId: 1,
        isDefault: true,
        defaultFieldMapping: 'last_name',
        options: [],
      },
      {
        name: 'Email',
        dataType: 'string' as const,
        workspaceId: 1,
        isDefault: true,
        defaultFieldMapping: 'email',
        options: [],
      },
      {
        name: 'Phone Number',
        dataType: 'string' as const,
        workspaceId: 1,
        isDefault: true,
        defaultFieldMapping: 'phone_number',
        options: [],
      },
    ]

    // Create predefined custom contact attributes
    const customAttributes = [
      {
        name: 'Contact Type',
        dataType: 'single_choice' as const,
        workspaceId: 1,
        isDefault: false,
        defaultFieldMapping: null,
        options: [
          { value: 'lead', label: 'Lead', sortOrder: 0 },
          { value: 'prospect', label: 'Prospect', sortOrder: 1 },
          { value: 'customer', label: 'Customer', sortOrder: 2 },
          { value: 'partner', label: 'Partner', sortOrder: 3 },
        ],
      },
      {
        name: 'Communication Preference',
        dataType: 'multiple_choice' as const,
        workspaceId: 1,
        isDefault: false,
        defaultFieldMapping: null,
        options: [
          { value: 'email', label: 'Email', sortOrder: 0 },
          { value: 'phone', label: 'Phone', sortOrder: 1 },
          { value: 'sms', label: 'SMS', sortOrder: 2 },
          { value: 'linkedin', label: 'LinkedIn', sortOrder: 3 },
          { value: 'in_person', label: 'In Person', sortOrder: 4 },
        ],
      },
      {
        name: 'Industry',
        dataType: 'single_choice' as const,
        workspaceId: 1,
        isDefault: false,
        defaultFieldMapping: null,
        options: [
          { value: 'technology', label: 'Technology', sortOrder: 0 },
          { value: 'finance', label: 'Finance', sortOrder: 1 },
          { value: 'healthcare', label: 'Healthcare', sortOrder: 2 },
          { value: 'retail', label: 'Retail', sortOrder: 3 },
          { value: 'manufacturing', label: 'Manufacturing', sortOrder: 4 },
          { value: 'education', label: 'Education', sortOrder: 5 },
          { value: 'real_estate', label: 'Real Estate', sortOrder: 6 },
          { value: 'consulting', label: 'Consulting', sortOrder: 7 },
        ],
      },
      {
        name: 'Company Size',
        dataType: 'single_choice' as const,
        workspaceId: 1,
        isDefault: false,
        defaultFieldMapping: null,
        options: [
          { value: 'startup', label: 'Startup (1-10)', sortOrder: 0 },
          { value: 'small', label: 'Small (11-50)', sortOrder: 1 },
          { value: 'medium', label: 'Medium (51-200)', sortOrder: 2 },
          { value: 'large', label: 'Large (201-1000)', sortOrder: 3 },
          { value: 'enterprise', label: 'Enterprise (1000+)', sortOrder: 4 },
        ],
      },
      {
        name: 'Lead Score',
        dataType: 'number' as const,
        workspaceId: 1,
        isDefault: false,
        defaultFieldMapping: null,
        options: [],
      },
      {
        name: 'Is Decision Maker',
        dataType: 'boolean' as const,
        workspaceId: 1,
        isDefault: false,
        defaultFieldMapping: null,
        options: [],
      },
      {
        name: 'Notes',
        dataType: 'string' as const,
        workspaceId: 1,
        isDefault: false,
        defaultFieldMapping: null,
        options: [],
      },
      {
        name: 'Last Contact Date',
        dataType: 'date' as const,
        workspaceId: 1,
        isDefault: false,
        defaultFieldMapping: null,
        options: [],
      },
    ]

    // Combine both default and custom attributes
    const allAttributes = [...defaultAttributes, ...customAttributes]

    for (const attributeData of allAttributes) {
      // Create the attribute
      const attribute = await ContactAttribute.create({
        name: attributeData.name,
        dataType: attributeData.dataType,
        workspaceId: attributeData.workspaceId,
        isDefault: attributeData.isDefault,
        defaultFieldMapping: attributeData.defaultFieldMapping,
      })

      // Create options for choice-based attributes
      if (attributeData.options.length > 0) {
        for (const optionData of attributeData.options) {
          await ContactAttributeOption.create({
            contactAttributeId: attribute.id,
            optionValue: optionData.value,
            optionLabel: optionData.label,
            sortOrder: optionData.sortOrder,
          })
        }
      }
    }
  }
}
