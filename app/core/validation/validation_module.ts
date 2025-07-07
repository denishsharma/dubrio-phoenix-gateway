import VineValidationService from '#core/validation/services/vine_validation_service'
import { Layer } from 'effect'

export const CORE_VALIDATION_MODULE_LAYER = Layer.mergeAll(
  VineValidationService.Default,
)
