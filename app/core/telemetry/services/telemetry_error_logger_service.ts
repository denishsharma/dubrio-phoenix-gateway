import type { Exception } from '#core/error/factories/exception'
import type { InternalError } from '#core/error/factories/internal_error'
import type { Jsonifiable } from 'type-fest'
import { KIND_MARKER } from '#constants/proto_marker'
import { ErrorKind } from '#core/error/constants/error_kind'
import ErrorValidationService from '#core/error/services/error_validation_service'
import JsonService from '#core/json/services/json_service'
import SchemaError from '#core/schema/errors/schema_error'
import { TelemetryAllowError } from '#core/telemetry/constants/telemetry_allow_error'
import { TelemetryErrorSource } from '#core/telemetry/constants/telemetry_error_source'
import env from '#start/env'
import { Exception as FrameworkException } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'
import otelLogs from '@opentelemetry/api-logs'
import { Effect, Inspectable, Match, Option, pipe } from 'effect'
import { defaultTo, has, omit } from 'lodash-es'

export default class TelemetryErrorLoggerService extends Effect.Service<TelemetryErrorLoggerService>()('@service/core/telemetry/error_logger', {
  dependencies: [JsonService.Default, ErrorValidationService.Default],
  effect: Effect.gen(function* () {
    const json = yield* JsonService
    const errorValidation = yield* ErrorValidationService

    /**
     * Internal function to log the application exception and internal error
     * to the telemetry logger using the OpenTelemetry API.
     *
     * @param logger - The OpenTelemetry logger instance.
     */
    function logApplicationError(logger: otelLogs.Logger) {
      /**
       * @param error - The application error to log.
       */
      return (error: Exception<string, any, any> | InternalError<string, any, any>) =>
        Effect.gen(function* () {
          const clock = yield* Effect.clock

          const data = yield* pipe(
            error.data,
            SchemaError.fromParseError('Unexpected error occurred while decoding error data.'),
            Effect.map(
              Option.match({
                onNone: () => undefined,
                onSome: value => value,
              }),
            ),
            Effect.flatMap(json.stringify(2)),
          )

          const cause = is.nullOrUndefined(error.cause)
            ? undefined
            : yield* pipe(
              {
                name: error.cause.name,
                message: error.cause.message,
                stack: error.cause.stack,
              },
              json.stringify(2),
            )

          logger.emit({
            body: error[KIND_MARKER] === ErrorKind.INTERNAL ? `[INTERNAL] ${error.toString()}` : `[EXCEPTION] ${error.toString()}`,
            severityNumber: otelLogs.SeverityNumber.ERROR,
            severityText: 'ERROR',
            timestamp: new Date(),
            observedTimestamp: clock.unsafeCurrentTimeMillis(),
            attributes: {
              type: error._tag,
              kind: error[KIND_MARKER],
              message: error.message,
              data: data || undefined,
              stack: error.stack,
              cause,
            },
          })
        })
    }

    /**
     * Internal function to log the framework exception to the telemetry logger
     * using the OpenTelemetry API.
     *
     * @param logger - The OpenTelemetry logger instance.
     */
    function logFrameworkException(logger: otelLogs.Logger) {
      /**
       * @param error - The framework exception to log.
       */
      return (error: FrameworkException) =>
        Effect.gen(function* () {
          const clock = yield* Effect.clock

          const data = has(error, 'data')
            ? is.object(error.data)
              ? yield* pipe(
                error.data,
                json.stringify(2),
              )
              : (error.data as any)
            : undefined

          const cause = is.nullOrUndefined(error.cause)
            ? undefined
            : error.cause instanceof Error
              ? yield* pipe(
                {
                  name: error.cause.name,
                  message: error.cause.message,
                  stack: error.cause.stack,
                },
                json.stringify(2),
              )
              : undefined

          logger.emit({
            body: `[ADONIS_EXCEPTION] ${error.toString()}`,
            severityNumber: otelLogs.SeverityNumber.ERROR,
            severityText: 'ERROR',
            timestamp: new Date(),
            observedTimestamp: clock.unsafeCurrentTimeMillis(),
            attributes: {
              type: error.code,
              kind: 'adonis_exception',
              message: error.message,
              data,
              stack: error.stack,
              cause,
            },
          })
        })
    }

    /**
     * Internal function to log the unknown error to the telemetry logger
     * using the OpenTelemetry API.
     *
     * @param logger - The OpenTelemetry logger instance.
     */
    function logUnknownError(logger: otelLogs.Logger) {
      /**
       * @param error - The unknown error to log.
       */
      return (error: unknown) =>
        Effect.gen(function* () {
          const clock = yield* Effect.clock

          const cause = is.error(error)
            ? yield* pipe(
              {
                name: error.name,
                message: error.message,
                stack: error.stack,
                serialized: yield* pipe(
                  Inspectable.toJSON(omit(error, ['stack', 'message'])) as Jsonifiable,
                  json.stringify(2),
                ),
              },
              json.stringify(2),
            )
            : yield* pipe(
              Inspectable.toJSON(error) as Jsonifiable,
              json.stringify(2),
            )

          logger.emit({
            body: `[UNKNOWN ERROR] ${Inspectable.toStringUnknown(error)}`,
            severityNumber: otelLogs.SeverityNumber.ERROR,
            severityText: 'ERROR',
            timestamp: new Date(),
            observedTimestamp: clock.unsafeCurrentTimeMillis(),
            attributes: {
              type: 'unknown_error',
              kind: 'unknown_error',
              message: Inspectable.toStringUnknown(error),
              cause,
            },
          })
        })
    }

    function fromTelemetryErrorSource(logger: otelLogs.Logger) {
      /**
       * @param error - The telemetry error to log.
       */
      return (error: TelemetryErrorSource) =>
        pipe(
          TelemetryErrorSource.$match(error, {
            internal: ({ error: err }) => logApplicationError(logger)(err),
            exception: ({ error: err }) => logApplicationError(logger)(err),
            frameworkException: ({ error: err }) => logFrameworkException(logger)(err),
            unknown: ({ error: err }) => logUnknownError(logger)(err),
          }),
        )
    }

    function log(allowed: TelemetryAllowError[], scope: string, version?: string) {
      /**
       * @param error - The unknown error to log.
       */
      return (error: unknown) => {
        const otelLogger = otelLogs.logs.getLogger(scope, defaultTo(version, env.get('OTEL_APPLICATION_SERVICE_VERSION')))

        return Match.value(error).pipe(
          Match.when(
            (err: unknown) => errorValidation.isException(err) && (allowed.includes(TelemetryAllowError.EXCEPTION) || allowed.includes(TelemetryAllowError.ALL)),
            err => pipe(
              TelemetryErrorSource.exception(err as Exception<string, any, any>),
              fromTelemetryErrorSource(otelLogger),
            ),
          ),
          Match.when(
            (err: unknown) => errorValidation.isInternalError(err) && (allowed.includes(TelemetryAllowError.INTERNAL) || allowed.includes(TelemetryAllowError.ALL)),
            err => pipe(
              TelemetryErrorSource.internal(err as InternalError<string, any, any>),
              fromTelemetryErrorSource(otelLogger),
            ),
          ),
          Match.when(
            (err: unknown) => err instanceof FrameworkException && (allowed.includes(TelemetryAllowError.FRAMEWORK_EXCEPTION) || allowed.includes(TelemetryAllowError.ALL)),
            err => pipe(
              TelemetryErrorSource.frameworkException(err as FrameworkException),
              fromTelemetryErrorSource(otelLogger),
            ),
          ),
          Match.when(
            (err: unknown) => (allowed.includes(TelemetryAllowError.UNKNOWN) || allowed.includes(TelemetryAllowError.ALL)) && (!errorValidation.isException(err) && !errorValidation.isInternalError(err) && !(err instanceof FrameworkException)),
            err => pipe(
              TelemetryErrorSource.unknown(err),
              fromTelemetryErrorSource(otelLogger),
            ),
          ),
          Match.orElse(() => Option.some(Effect.void)),
        ).pipe(Effect.transposeOption, Effect.asVoid)
      }
    }

    return {
      /**
       * Log the application exception and internal error to the telemetry logger
       * using the OpenTelemetry API.
       *
       * @param logger - The OpenTelemetry logger instance.
       */
      fromTelemetryErrorSource,

      /**
       * Log the application exception and internal error to the telemetry logger
       * using the OpenTelemetry API.
       *
       * @param allowed - The allowed error types to log.
       * @param scope - The scope of the telemetry logger.
       * @param version - The version of the telemetry logger.
       */
      log,
    }
  }),
}) {}
