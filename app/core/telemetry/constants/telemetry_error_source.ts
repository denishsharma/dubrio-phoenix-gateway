import type { Exception } from '#core/error/factories/exception'
import type { InternalError } from '#core/error/factories/internal_error'
import type { TaggedEnum } from '#types/tagged_enum'
import type { Exception as FrameworkException } from '@adonisjs/core/exceptions'
import type { Unify } from 'effect'
import { Option } from 'effect'
import { has } from 'lodash-es'

/**
 * A unique symbol used to mark the `TelemetryErrorSource` type.
 * This symbol is used to differentiate the `TelemetryErrorSource` type from tagged enums.
 */
export const TELEMETRY_ERROR_SOURCE_MARKER: unique symbol = Symbol('@constant/enum/core/telemetry/telemetry_error_source')

/**
 * The shape of the `TelemetryErrorSource` type used to define the structure
 * of the telemetry error source that can be accepted.
 */
export interface TelemetryErrorSourceShape {
  internal: { error: InternalError<string, any, any> };
  exception: { error: Exception<string, any, any> };
  frameworkException: { error: FrameworkException };
  unknown: { error: unknown };
}

/**
 * The `TelemetryErrorSource` type is a tagged enum that represents the different
 * types of telemetry error sources that can be accepted.
 */
export type TelemetryErrorSource = TaggedEnum<TelemetryErrorSourceShape, typeof TELEMETRY_ERROR_SOURCE_MARKER>

/**
 * TelemetryErrorSource is a tagged enum that represents the different types of telemetry error sources
 * that can be accepted.
 *
 * It is a holder for various telemetry error sources, such as internal errors,
 * exceptions, framework exceptions, and unknown errors.
 */
export const TelemetryErrorSource = {
  /**
   * The telemetry error source is an internal error.
   *
   * @param error - The known internal error.
   */
  internal: (error: InternalError<string, any, any>) => ({ error, _tag: 'internal' }) as TelemetryErrorSource,

  /**
   * The telemetry error source is an exception.
   *
   * @param exception - The known exception.
   */
  exception: (exception: Exception<string, any, any>) => ({ error: exception, _tag: 'exception' }) as TelemetryErrorSource,

  /**
   * The telemetry error source is a framework exception.
   *
   * @param exception - The AdonisJS framework exception.
   */
  frameworkException: (exception: FrameworkException) => ({ error: exception, _tag: 'frameworkException' }) as TelemetryErrorSource,

  /**
   * The telemetry error source is an unknown error.
   *
   * @param error - The unknown error.
   */
  unknown: (error: unknown) => ({ error, _tag: 'unknown' }) as TelemetryErrorSource,

  /**
   * Check if the given telemetry error source is of a specific type of telemetry error source
   * by comparing the `_tag` property.
   *
   * @param tag - The tag to check against.
   */
  $is: <T extends TelemetryErrorSource['_tag']>(tag: T) => (source: TelemetryErrorSource): source is Extract<TelemetryErrorSource, { _tag: T }> => {
    return source._tag === tag
  },

  /**
   * Match the given telemetry error source against a specific type of telemetry error source
   * and return the result of the matching function.
   *
   * @param source - The telemetry error source to match.
   * @param matcher - The object containing the matching functions for each type of telemetry error source.
   */
  $match: <T extends { readonly [M in TelemetryErrorSource['_tag']]: (source: Extract<TelemetryErrorSource, { _tag: M }>) => any }>(source: TelemetryErrorSource, matcher: T): Option.Option<Unify.Unify<ReturnType<T[TelemetryErrorSource['_tag']]>>> => {
    if (has(matcher, source._tag)) {
      return Option.some(matcher[source._tag](source as any) as Unify.Unify<ReturnType<T[TelemetryErrorSource['_tag']]>>)
    }
    return Option.none<Unify.Unify<ReturnType<T[TelemetryErrorSource['_tag']]>>>()
  },
}
