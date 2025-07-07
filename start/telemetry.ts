/*
|--------------------------------------------------------------------------
| OpenTelemetry Configuration
|--------------------------------------------------------------------------
|
| Here you can define the configuration for OpenTelemetry. The configuration
| is loaded when the application starts.
|
*/

import env from '#start/env'
import { BullMQInstrumentation } from '@appsignal/opentelemetry-instrumentation-bullmq'
import opentelemetry from '@opentelemetry/api'
import otelLogs from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { HostMetrics } from '@opentelemetry/host-metrics'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { MySQL2Instrumentation } from '@opentelemetry/instrumentation-mysql2'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

/**
 * Define the OpenTelemetry Resource for the application,
 * which contains metadata about the service.
 *
 * Here, service is the current application.
 */
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: env.get('OTEL_APPLICATION_SERVICE_NAME'),
  [ATTR_SERVICE_VERSION]: env.get('OTEL_APPLICATION_SERVICE_VERSION'),
})

/**
 * Create a new OpenTelemetry Trace Provider with a BatchSpanProcessor
 * that exports spans to the OpenTelemetry Collector.
 */
export const otelTraceProvider = new NodeTracerProvider({
  resource,
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
})
otelTraceProvider.register()

/**
 * Create a new OpenTelemetry Metric Provider with a PeriodicExportingMetricReader
 * that exports metrics to the OpenTelemetry Collector.
 *
 * ? Note: Do not use Effect's built-in metrics, as they require a different setup.
 */
const otelMetricProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: 5000,
    }),
  ],
})

/**
 * Create a new HostMetrics instance that collects and exports host metrics.
 */
const hostMetrics = new HostMetrics({
  meterProvider: otelMetricProvider,
})
hostMetrics.start()

/**
 * Create a new OpenTelemetry Logger Provider with a BatchLogRecordProcessor
 * that exports logs to the OpenTelemetry Collector.
 */
const otelLoggerProvider = new LoggerProvider({ resource })
otelLoggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(new OTLPLogExporter()))

/**
 * Register all the auto-instrumentations for the application.
 */
registerInstrumentations({
  instrumentations: [
    new MySQL2Instrumentation(),
    new BullMQInstrumentation(),
  ],
  loggerProvider: otelLoggerProvider,
  tracerProvider: otelTraceProvider,
  meterProvider: otelMetricProvider,
})

/**
 * Set the global OpenTelemetry providers for the application.
 */
opentelemetry.trace.setGlobalTracerProvider(otelTraceProvider)
opentelemetry.metrics.setGlobalMeterProvider(otelMetricProvider)
otelLogs.logs.setGlobalLoggerProvider(otelLoggerProvider)
