import type opentelemetry from '@opentelemetry/api'
import TelemetryUtilityService from '#core/telemetry/services/telemetry_utility_service'
import env from '#start/env'
import { Resource, Tracer } from '@effect/opentelemetry'
import otelLogs from '@opentelemetry/api-logs'
import { Array, Effect, FiberId, Layer, Logger, Match } from 'effect'
import { defaultTo } from 'lodash-es'

export default class TelemetryLayerService extends Effect.Service<TelemetryLayerService>()('@service/core/telemetry/layer', {
  dependencies: [TelemetryUtilityService.Default],
  effect: Effect.gen(function* () {
    const telemetryUtility = yield* TelemetryUtilityService

    function createScopedLoggerLayer(scope: string, version?: string) {
      return Logger.addEffect(
        Effect.gen(function* () {
          const clock = yield* Effect.clock
          const logger = otelLogs.logs.getLogger(scope, defaultTo(version, env.get('OTEL_APPLICATION_SERVICE_VERSION')))

          return Logger.make((options) => {
            const now = options.date.getTime()

            /**
             * Add the fiber ID and annotations to the log attributes
             * for the current log entry
             */
            const attributes: Record<string, opentelemetry.AttributeValue> = {
              fiber_id: FiberId.threadName(options.fiberId),
            }

            /**
             * Add the annotations and spans to the log attributes
             * for the current log entry
             */
            for (const [key, value] of Object.entries(options.annotations)) {
              attributes[key] = telemetryUtility.transformUnknownToTelemetryAttributeValue(value)
            }

            /**
             * Add the spans to the log attributes for the current log entry
             * and calculate the span durations
             */
            for (const span of options.spans) {
              attributes[`log_span.${span.label}`] = `${now - span.startTime}ms`
            }

            /**
             * Emit the log entry with the specified message and attributes
             * to the OpenTelemetry logs
             */
            const message = Array.ensure(options.message).map(telemetryUtility.transformUnknownToTelemetryAttributeValue)
            logger.emit({
              body: message.length === 1 ? message[0] : message,
              severityText: options.logLevel.label,
              severityNumber: Match.value(options.logLevel._tag).pipe(
                Match.when('Info', () => otelLogs.SeverityNumber.INFO),
                Match.when('Warning', () => otelLogs.SeverityNumber.WARN),
                Match.when('Error', () => otelLogs.SeverityNumber.ERROR),
                Match.when('Fatal', () => otelLogs.SeverityNumber.FATAL),
                Match.when('Debug', () => otelLogs.SeverityNumber.DEBUG),
                Match.when('Trace', () => otelLogs.SeverityNumber.TRACE),
                Match.when('None', () => otelLogs.SeverityNumber.UNSPECIFIED),
                Match.orElse(() => otelLogs.SeverityNumber.UNSPECIFIED),
              ),
              timestamp: options.date,
              observedTimestamp: clock.unsafeCurrentTimeMillis(),
              attributes,
            })
          })
        }),
      )
    }

    function createScopedTracerLayer(scope: string, version?: string) {
      return Layer.mergeAll(Tracer.layerGlobal).pipe(
        Layer.provideMerge(
          Resource.layer({
            serviceName: scope,
            serviceVersion: version,
          }),
        ),
      )
    }

    function createScopedTelemetryProvider(scope: string, version?: string) {
      return Effect.provide(
        Layer.mergeAll(Tracer.layerGlobal, createScopedLoggerLayer(scope, version)).pipe(
          Layer.provideMerge(
            Resource.layer({
              serviceName: scope,
              serviceVersion: defaultTo(version, env.get('OTEL_APPLICATION_SERVICE_VERSION')),
            }),
          ),
        ),
      )
    }

    return {
      /**
       * Creates a scoped logger layer using the OpenTelemetry Logger API
       * for the Effect logger with the specified scope and version.
       *
       * This allows logging operations within a defined module, service,
       * or component, enabling better observability and debugging.
       *
       * @param scope - The scope of the logger.
       * @param version - The version of the logger.
       */
      createScopedLoggerLayer,

      /**
       * Creates a scoped tracer layer using the OpenTelemetry Tracer API
       * for the specified scope and version.
       *
       * This allows tracing operations within a defined module, service,
       * or component, enabling better observability and debugging.
       *
       * @param scope - The scope for the tracer layer.
       * @param version - The version associated with the tracer layer.
       */
      createScopedTracerLayer,

      /**
       * Creates a scoped telemetry provider using the OpenTelemetry Tracer and Logs API
       * for a specified scope and version.
       *
       * This provider includes:
       *   - OpenTelemetry tracing and logging capabilities.
       *   - Resource attributes for enhanced context within the application.
       *
       * Note: This does *not* include OpenTelemetry metrics, as additional configuration
       *       and setup are required.
       *
       * @param scope - The scope for the telemetry provider.
       * @param version - The version associated with the telemetry provider.
       */
      createScopedTelemetryProvider,
    }
  }),
}) {}
