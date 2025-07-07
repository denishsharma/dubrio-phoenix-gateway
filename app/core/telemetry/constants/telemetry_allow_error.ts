import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const TELEMETRY_ALLOW_ERROR = Enum({
  /**
   * Allow all internal errors to be logged.
   */
  INTERNAL: 'internal',

  /**
   * Allow all exceptions to be logged.
   */
  EXCEPTION: 'exception',

  /**
   * Allow all framework exceptions to be logged.
   */
  FRAMEWORK_EXCEPTION: 'framework_exception',

  /**
   * Allow all unknown errors to be logged which
   * are not known to the system.
   */
  UNKNOWN: 'unknown',

  /**
   * Allow all errors to be logged including
   * unknown errors.
   */
  ALL: 'all',
})

export type TelemetryAllowError = InferValue<typeof TELEMETRY_ALLOW_ERROR>
export const TelemetryAllowError = TELEMETRY_ALLOW_ERROR.accessor
