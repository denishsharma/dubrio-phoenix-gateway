import ContactAttributeService from '#modules/contact/services/contact_attribute_service'
import ContactService from '#modules/contact/services/contact_service'
import { Layer } from 'effect'

export const CONTACT_MODULE_LAYER = Layer.mergeAll(
  ContactService.Default,
  ContactAttributeService.Default,
)
