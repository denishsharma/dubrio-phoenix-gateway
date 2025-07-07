import ErrorCauseService from '#core/error/services/error_cause_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import ErrorValidationService from '#core/error/services/error_validation_service'
import { Layer } from 'effect'

export const CORE_ERROR_MODULE_LAYER = Layer.mergeAll(
  ErrorValidationService.Default,
  ErrorCauseService.Default,
  ErrorConversionService.Default,
)
