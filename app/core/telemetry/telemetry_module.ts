import TelemetryErrorLoggerService from '#core/telemetry/services/telemetry_error_logger_service'
import TelemetryLayerService from '#core/telemetry/services/telemetry_layer_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import TelemetryUtilityService from '#core/telemetry/services/telemetry_utility_service'
import { Layer } from 'effect'

export const CORE_TELEMETRY_MODULE_LAYER = Layer.mergeAll(
  TelemetryUtilityService.Default,
  TelemetryErrorLoggerService.Default,
  TelemetryLayerService.Default,
  TelemetryService.Default,
)
