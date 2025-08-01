import ContactService from '#modules/contact/services/contact_service'
import { Layer } from 'effect'

export const CONTACT_MODULE_LAYER = Layer.mergeAll(
  ContactService.Default,
)
