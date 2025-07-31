/**
 * Example usage of the Contact EAV (Entity-Attribute-Value) system
 *
 * This file demonstrates how to:
 * 1. Create contact attributes with options
 * 2. Set attribute values for contacts
 * 3. Query contacts by attribute values
 * 4. Retrieve all attribute values for a contact
 */

import ContactAttribute from '#models/contact_attribute_model'
import ContactAttributeOption from '#models/contact_attribute_option_model'
import ContactAttributeValue from '#models/contact_attribute_value_model'
import Contact from '#models/contact_model'

export class ContactEavExample {
  /**
   * Example: Create a new contact attribute with options
   */
  static async createContactTypeAttribute(workspaceId: number) {
    // Create the attribute
    const attribute = await ContactAttribute.create({
      workspaceId,
      name: 'Contact Type',
      dataType: 'single_choice',
    })

    // Create options for the attribute
    const options = [
      { value: 'lead', label: 'Lead', sortOrder: 0 },
      { value: 'prospect', label: 'Prospect', sortOrder: 1 },
      { value: 'customer', label: 'Customer', sortOrder: 2 },
      { value: 'partner', label: 'Partner', sortOrder: 3 },
    ]

    for (const optionData of options) {
      await ContactAttributeOption.create({
        contactAttributeId: attribute.id,
        optionValue: optionData.value,
        optionLabel: optionData.label,
        sortOrder: optionData.sortOrder,
      })
    }

    return attribute
  }

  /**
   * Example: Set attribute values for a contact
   */
  static async setContactAttributes(contactId: number) {
    // Get some attributes to work with
    const contactTypeAttr = await ContactAttribute
      .query()
      .where('name', 'Contact Type')
      .first()

    const leadScoreAttr = await ContactAttribute
      .query()
      .where('name', 'Lead Score')
      .first()

    const notesAttr = await ContactAttribute
      .query()
      .where('name', 'Notes')
      .first()

    // Set contact type (single choice)
    if (contactTypeAttr) {
      const leadOption = await ContactAttributeOption
        .query()
        .where('contactAttributeId', contactTypeAttr.id)
        .where('optionValue', 'lead')
        .first()

      if (leadOption) {
        await ContactAttributeValue.create({
          contactId,
          attributeId: contactTypeAttr.id,
          optionId: leadOption.id,
          valueText: 'lead',
          valueNumber: null,
          valueBoolean: null,
        })
      }
    }

    // Set lead score (number)
    if (leadScoreAttr) {
      await ContactAttributeValue.create({
        contactId,
        attributeId: leadScoreAttr.id,
        optionId: null,
        valueText: null,
        valueNumber: 85,
        valueBoolean: null,
      })
    }

    // Set notes (string)
    if (notesAttr) {
      await ContactAttributeValue.create({
        contactId,
        attributeId: notesAttr.id,
        optionId: null,
        valueText: 'High-value prospect from tech industry',
        valueNumber: null,
        valueBoolean: null,
      })
    }
  }

  /**
   * Example: Get all attribute values for a contact
   */
  static async getContactAttributeValues(contactId: number) {
    const attributeValues = await ContactAttributeValue
      .query()
      .where('contactId', contactId)
      .preload('attribute')
      .preload('option')

    const result: Record<string, any> = {}

    for (const value of attributeValues) {
      const attributeName = value.attribute.name

      if (value.valueText !== null) {
        result[attributeName] = value.valueText
      } else if (value.valueNumber !== null) {
        result[attributeName] = value.valueNumber
      } else if (value.valueBoolean !== null) {
        result[attributeName] = value.valueBoolean
      }

      // If it's a choice type, also include the option label
      if (value.option) {
        result[`${attributeName}_label`] = value.option.optionLabel
      }
    }

    return result
  }

  /**
   * Example: Find contacts by attribute value
   */
  static async findContactsByType(workspaceId: number, contactType: string) {
    // First find the contact type attribute
    const attribute = await ContactAttribute
      .query()
      .where('workspaceId', workspaceId)
      .where('name', 'Contact Type')
      .first()

    if (!attribute) {
      return []
    }

    // Find all attribute values for this type
    const attributeValues = await ContactAttributeValue
      .query()
      .where('attributeId', attribute.id)
      .where('valueText', contactType)

    const contactIds = attributeValues.map(av => av.contactId)

    if (contactIds.length === 0) {
      return []
    }

    // Get the contacts
    return Contact
      .query()
      .whereIn('id', contactIds)
  }

  /**
   * Example: Find high-scoring leads
   */
  static async findHighScoringLeads(workspaceId: number, minScore: number = 80) {
    // Find the lead score attribute
    const attribute = await ContactAttribute
      .query()
      .where('workspaceId', workspaceId)
      .where('name', 'Lead Score')
      .first()

    if (!attribute) {
      return []
    }

    // Find all attribute values with score >= minScore
    const attributeValues = await ContactAttributeValue
      .query()
      .where('attributeId', attribute.id)
      .where('valueNumber', '>=', minScore)

    const contactIds = attributeValues.map(av => av.contactId)

    if (contactIds.length === 0) {
      return []
    }

    // Get the contacts with their scores
    const contacts = await Contact
      .query()
      .whereIn('id', contactIds)

    // Enrich with score data
    return contacts.map((contact) => {
      const scoreValue = attributeValues.find(av => av.contactId === contact.id)
      return {
        ...contact.toJSON(),
        leadScore: scoreValue?.valueNumber || 0,
      }
    })
  }

  /**
   * Example: Get contact summary with all attributes
   */
  static async getContactSummary(contactId: number) {
    const contact = await Contact.find(contactId)
    if (!contact) {
      return null
    }

    const attributes = await this.getContactAttributeValues(contactId)

    return {
      contact: contact.toJSON(),
      attributes,
    }
  }
}
