import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const CONTACT_ATTRIBUTE_DATA_TYPE = Enum({
  STRING: 'string',
  NUMBER: 'number',
  DATE: 'date',
  BOOLEAN: 'boolean',
  SINGLE_CHOICE: 'single_choice',
  MULTIPLE_CHOICE: 'multiple_choice',
})

export type ContactAttributeDataType = InferValue<typeof CONTACT_ATTRIBUTE_DATA_TYPE>
export const ContactAttributeDataType = CONTACT_ATTRIBUTE_DATA_TYPE.accessor
