import type { Exception } from '#core/error/factories/exception'
import type { ResponseDataMode } from '#core/http/constants/response_data_mode'
import type { UnknownRecord } from 'type-fest'
import { ResponseType } from '#core/http/constants/response_type'
import { WithEmptyResponseData } from '#core/http/constants/with_empty_response_data'
import ExceptionResponse from '#core/http/schemas/exception_response_schema'
import SuccessResponse from '#core/http/schemas/success_response_schema'
import HttpRequestService from '#core/http/services/http_request_service'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import HttpResponseUtilityService from '#core/http/services/http_response_utility_service'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import { cuid } from '@adonisjs/core/helpers'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Effect, Option, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { defaultTo } from 'lodash-es'

/**
 * Options to be used for creating a success response
 * for the client.
 */
export interface MakeSuccessResponseOptions {
  /**
   * The HTTP status code to be used for the response.
   */
  status?: StatusCodes;

  /**
   * The message to be used for the response when sending
   * response to the client.
   */
  message?: string;

  /**
   * The data mode to be used for the response to indicate
   * how the data should be serialized or transformed.
   */
  dataMode?: ResponseDataMode;

  /**
   * Additional metadata to be included in the response for
   * the client to consume.
   */
  metadata?: UnknownRecord;
}

/**
 * Options to be used for creating an exception response
 * for the client.
 */
export interface MakeExceptionResponseOptions {
  /**
   * The HTTP status code to be used for the response.
   */
  status?: StatusCodes;

  /**
   * A human-readable message to be used for describing
   * the exception to the client.
   */
  message?: string;

  /**
   * Additional metadata to be included in the response for
   * the client to consume.
   */
  metadata?: UnknownRecord;
}

export default class HttpMakeResponseService extends Effect.Service<HttpMakeResponseService>()('@service/core/http/make_response', {
  dependencies: [
    HttpRequestService.Default,
    HttpResponseContextService.Default,
    HttpResponseUtilityService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const request = yield* HttpRequestService
    const context = yield* HttpResponseContextService
    const responseUtility = yield* HttpResponseUtilityService
    const telemetry = yield* TelemetryService

    function makeSuccessResponse(options?: MakeSuccessResponseOptions) {
      /**
       * @param data - The data to be used for creating the response.
       */
      return (data: unknown) =>
        Effect.gen(function* () {
          const metadata = yield* context.getMetadata
          const dataMode = yield* context.getDataMode
          const message = yield* context.getMessage

          const requestId = yield* request.getCurrentRequestId.pipe(
            Effect.catchTag('@error/internal/http_context_unavailable', () => Effect.succeed(Option.none<string>())),
            Effect.map(Option.getOrElse(() => cuid())),
          )

          const resolvedOptions = defu(
            options,
            {
              message,
              metadata,
              status: StatusCodes.OK,
              dataMode: defaultTo(dataMode, responseUtility.inferResponseDataMode(data)),
            } satisfies MakeSuccessResponseOptions,
          )

          return yield* Effect.gen(function* () {
            /**
             * Build the response object to be sent to the client.
             */
            const response = {
              data: WithEmptyResponseData.$isWithEmptyResponseData(data) ? undefined : data,
              type: ResponseType.SUCCESS,
              status: resolvedOptions.status,
              message: is.string(resolvedOptions.message) ? resolvedOptions.message : undefined,
              metadata: defu(
                {
                  request_id: requestId,
                  data_mode: resolvedOptions.dataMode,
                  timestamp: new Date().toISOString(),
                },
                resolvedOptions.metadata,
              ),
            } satisfies typeof SuccessResponse.Encoded

            /**
             * Validate the response metadata against the data mode.
             */
            yield* responseUtility.validateResponseMetadata({
              metadata: response.metadata,
              dataMode: resolvedOptions.dataMode,
            }).pipe(telemetry.withTelemetrySpan('validate_metadata'))

            /**
             * Validate the response data against the data mode.
             */
            yield* responseUtility.validateResponseData({
              data: response.data,
              dataMode: resolvedOptions.dataMode,
            }).pipe(telemetry.withTelemetrySpan('validate_data_mode'))

            return yield* Effect.suspend(() =>
              Schema.decode(SuccessResponse, { errors: 'all' })(response).pipe(
                SchemaError.fromParseError('Unexpected error occurred while decoding the success response.'),
              ),
            ).pipe(telemetry.withTelemetrySpan('decode_response'))
          })
        }).pipe(telemetry.withTelemetrySpan('make_success_response'))
    }

    function makeExceptionResponse(options?: MakeExceptionResponseOptions) {
      /**
       * @param exception - The exception to be used for creating the response.
       */
      return <T extends string, A = never, I = never>(exception: Exception<T, A, I>) =>
        Effect.gen(function* () {
          const metadata = yield* context.getMetadata

          const requestId = yield* request.getCurrentRequestId.pipe(
            Effect.catchTag('@error/internal/http_context_unavailable', () => Effect.succeed(Option.none<string>())),
            Effect.map(Option.getOrElse(() => cuid())),
          )

          const resolvedOptions = defu(
            options,
            {
              metadata,
              status: exception.status,
              message: exception.message,
            } satisfies MakeExceptionResponseOptions,
          )

          return yield* Effect.gen(function* () {
            /**
             * Extract the exception data from the exception.
             */
            const data = yield* exception.data.pipe(
              SchemaError.fromParseError('Unexpected error occurred while decoding the exception data.'),
              Effect.map(Option.getOrUndefined),
            )

            /**
             * Build the response object to be sent to the client.
             */
            const response = {
              data: WithEmptyResponseData.$isWithEmptyResponseData(data) ? undefined : data,
              type: ResponseType.EXCEPTION,
              status: resolvedOptions.status,
              message: resolvedOptions.message,
              exception: exception.code,
              metadata: defu(
                {
                  request_id: requestId,
                  timestamp: new Date().toISOString(),
                },
                resolvedOptions.metadata,
              ),
            } satisfies typeof ExceptionResponse.Encoded

            return yield* Effect.suspend(() =>
              Schema.decode(ExceptionResponse, { errors: 'all' })(response).pipe(
                SchemaError.fromParseError('Unexpected error occurred while decoding the exception response.'),
              ),
            ).pipe(telemetry.withTelemetrySpan('decode_response'))
          })
        }).pipe(telemetry.withTelemetrySpan('make_exception_response'))
    }

    return {
      /**
       * Create a success response to be sent to the client.
       *
       * @param options - The options to be used for creating the response.
       */
      makeSuccessResponse,

      /**
       * Create an exception response to be sent to the client.
       *
       * @param options - The options to be used for creating the response.
       */
      makeExceptionResponse,
    }
  }),
}) {}
