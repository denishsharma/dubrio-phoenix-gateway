import type { Exception } from '#core/error/factories/exception'
import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import { ExceptionCode } from '#constants/exception_code'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import { ResponseType } from '#core/http/constants/response_type'
import HttpContext from '#core/http/contexts/http_context'
import ExceptionResponse from '#core/http/schemas/exception_response_schema'
import HttpMakeResponseService from '#core/http/services/http_make_response_service'
import SchemaError from '#core/schema/errors/schema_error'
import { TelemetryAllowError } from '#core/telemetry/constants/telemetry_allow_error'
import TelemetryErrorLoggerService from '#core/telemetry/services/telemetry_error_logger_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import { ApplicationRuntime } from '#start/runtime'
import { ExceptionHandler } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Effect, Inspectable, pipe, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { defaultTo } from 'lodash-es'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * An array of HTTP status codes to ignore when reporting
   * an error
   */
  protected ignoreStatuses: number[] = [
    400,
    422,
    401,
  ]

  /**
   * An array of error codes to ignore when reporting
   * an error
   */
  protected ignoreCodes: string[] = []

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  override async handle(error: unknown, ctx: FrameworkHttpContext) {
    const response = await ApplicationRuntime.runPromise(
      pipe(
        Effect.gen(function* () {
          const errorConversion = yield* ErrorConversionService
          const makeResponse = yield* HttpMakeResponseService
          const telemetry = yield* TelemetryService

          return yield* Effect.gen(function* () {
            return yield* Effect.gen(function* () {
              return yield* Effect.gen(function* () {
                const exception = pipe(error, errorConversion.toException()) as Exception<string, any, any>
                const exceptionResponse = yield* pipe(exception, makeResponse.makeExceptionResponse())
                return yield* Effect.suspend(() =>
                  Schema.encode(ExceptionResponse, { errors: 'all' })(exceptionResponse).pipe(
                    SchemaError.fromParseError('Unexpected error occurred while encoding exception response.'),
                  ),
                ).pipe(telemetry.withTelemetrySpan('encode_exception_response'))
              }).pipe(telemetry.withTelemetrySpan('handle_exception_response'))
            }).pipe(
              /**
               * Catch all errors that occur while encoding the exception response
               * and log them to the logger.
               *
               * Return the manually created exception response
               * if the encoding fails.
               */
              Effect.catchAll(
                err => Effect.gen(function* () {
                  /**
                   * Log error to the logger.
                   */
                  logger.fatal(
                    Inspectable.toJSON(err),
                    'Unexpected error occurred while handling the exception in the exception handler.',
                  )

                  yield* Effect.annotateCurrentSpan('manually_handled', true)
                  yield* Effect.annotateCurrentSpan('exception', Inspectable.toJSON(err))

                  return {
                    type: ResponseType.EXCEPTION,
                    status: StatusCodes.INTERNAL_SERVER_ERROR,
                    exception: ExceptionCode.E_INTERNAL_SERVER,
                    message: 'FATAL ERROR: Unexpected error occurred while handling the exception in the exception handler.',
                    metadata: {
                      request_id: defaultTo(ctx.request.id(), '[UNIDENTIFIED]'),
                      timestamp: new Date().toISOString(),
                    },
                  } satisfies typeof ExceptionResponse.Encoded
                }).pipe(telemetry.withTelemetrySpan('manually_create_exception_response')),
              ),
            )
          }).pipe(telemetry.withScopedTelemetry('global_error_handler'))
        }),
        Effect.provide(HttpContext.provide(ctx)),
      ),
    )

    return ctx.response.status(response.status).json(response)
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: FrameworkHttpContext) {
    await ApplicationRuntime.runPromise(
      pipe(
        Effect.gen(function* () {
          const telemetryErrorLogger = yield* TelemetryErrorLoggerService
          const telemetry = yield* TelemetryService

          return yield* Effect.gen(function* () {
            yield* pipe(
              error,
              telemetryErrorLogger.log(
                [TelemetryAllowError.FRAMEWORK_EXCEPTION, TelemetryAllowError.UNKNOWN],
                'global_error_reporter',
              ),
            )
          }).pipe(
            telemetry.withTelemetrySpan('report_error'),
            telemetry.withScopedTelemetry('global_error_reporter'),
          )
        }),
        Effect.provide(HttpContext.provide(ctx)),
      ),
    )

    return super.report(error, ctx)
  }
}
