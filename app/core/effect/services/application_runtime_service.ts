import type { R } from '#core/effect/types/application_runtime'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import ErrorValidationService from '#core/error/services/error_validation_service'
import { TelemetryAllowError } from '#core/telemetry/constants/telemetry_allow_error'
import TelemetryErrorLoggerService from '#core/telemetry/services/telemetry_error_logger_service'
import logger from '@adonisjs/core/services/logger'
import { Cause, Effect, Match, pipe, Ref } from 'effect'

export default class ApplicationRuntimeService extends Effect.Service<ApplicationRuntimeService>()('@service/core/effect/application_runtime', {
  dependencies: [
    ErrorValidationService.Default,
    ErrorConversionService.Default,
    TelemetryErrorLoggerService.Default,
  ],
  effect: Effect.gen(function* () {
    const errorValidation = yield* ErrorValidationService
    const errorConversion = yield* ErrorConversionService
    const telemetryErrorLogger = yield* TelemetryErrorLoggerService

    function ensureDependencies<A, E, RD extends R | never>(self: Effect.Effect<A, E, RD>): Effect.Effect<A, E, RD> { return self }

    function managedEffect<A, E>(self: Effect.Effect<A, E, R>) {
      return self.pipe(
        Effect.scoped,

        /**
         * Tap into the effectful program to log any
         * errors that occur during the processing
         * of the content.
         */
        Effect.tapErrorCause(cause => Effect.gen(function* () {
          const causeRef = yield* Ref.make<Cause.Cause<unknown>>(cause)

          /**
           * Convert defects to failures.
           */
          yield* Ref.set(causeRef, Cause.fail((cause as Cause.Die).defect)).pipe(
            Effect.when(() => Cause.isDieType(cause)),
          )

          const fail = (yield* causeRef.get) as Cause.Fail<unknown>
          yield* pipe(fail.error, telemetryErrorLogger.log([TelemetryAllowError.ALL], 'managed_effect_runtime'))

          yield* Match.value(fail.error).pipe(
            Match.whenOr(
              errorValidation.isException,
              errorValidation.isInternalError,
              error => Effect.sync(() => {
                logger.error(
                  error.toJSON(),
                  `[effectful] ${error.toString()}`,
                )
              }),
            ),
            Match.orElse(
              Effect.fn(function* (error: unknown) {
                const err = errorConversion.toException()(error)
                logger.error(
                  err.toJSON(),
                  `[effectful] ${err.toString()}`,
                )
              }),
            ),
          )
        })),

        /**
         * Catch all non-exception errors and convert
         * them to exceptions.
         */
        Effect.catchIf(
          error => !errorValidation.isException(error),
          error => Effect.fail(errorConversion.toException()(error)),
        ),

        /**
         * Catch all defects and convert them to
         * known exceptions.
         */
        Effect.catchAllDefect(defect => Effect.fail(errorConversion.toException()(defect))),
      )
    }

    return {
      /**
       * Ensures that the effect has all of its dependencies resolved
       * before executing the effect.
       *
       * This provides only a type-level guarantee that the effect has
       * all of its dependencies resolved. It does not provide a runtime
       * guarantee that the effect has all of its dependencies resolved.
       */
      ensureDependencies,

      /**
       * Wraps the effectful program in a managed runtime.
       *
       * It ensures that the effectful program is managed
       * and all of its dependencies are resolved.
       *
       * It also logs any errors that occur during the processing
       * of the content.
       */
      managedEffect,
    }
  }),
}) {}
