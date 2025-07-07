import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import HttpContext from '#core/http/contexts/http_context'
import ExceptionResponse from '#core/http/schemas/exception_response_schema'
import SuccessResponse from '#core/http/schemas/success_response_schema'
import HttpMakeResponseService from '#core/http/services/http_make_response_service'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import { ApplicationRuntime } from '#start/runtime'
import { Effect, Option, pipe, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

export default class ResponseWrapperMiddleware {
  async handle(ctx: FrameworkHttpContext, next: NextFn) {
    const accepts = ctx.request.accepts(['json'])

    await next()

    const skipResponseWrapping = ctx.response.context.value.skipResponseWrapping

    /**
     * Wrap the response in standardized response format
     * only if the response has content and has JSON content type
     *
     * If skipResponseWrapping is true, then skip wrapping the response.
     * This is useful for cases where the response is already in a standardized format
     * or when the response is not meant to be wrapped (e.g., file downloads).
     */
    if (!skipResponseWrapping && ctx.response.hasContent) {
      /**
       * Get the content from the response
       * to be wrapped in standardized response format.
       */
      const content = ctx.response.content![0]

      const program = Effect.gen(function* () {
        const makeResponseService = yield* HttpMakeResponseService
        const telemetry = yield* TelemetryService

        return yield* Effect.gen(function* () {
          return yield* Effect.gen(function* () {
            /**
             * Validate that the content is a valid exception response
             * using the ExceptionResponse schema and decode it.
             *
             * If it a valid exception response, it will be encoded
             * and returned as the response content.
             */
            const exceptionResponse = yield* Schema.decodeUnknown(ExceptionResponse)(content).pipe(
              Effect.flatMap(
                result => Schema.encode(ExceptionResponse, { errors: 'all' })(result).pipe(
                  SchemaError.fromParseError('Unexpected error occurred while encoding exception response.'),
                ),
              ),
              Effect.tap(result => Effect.sync(() => {
                ctx.response.status(result.status)
              })),
              Effect.map(Option.some),
              Effect.catchTag('ParseError', () => Effect.succeed(Option.none<typeof ExceptionResponse.Encoded>())),
            )

            /**
             * Return the exception response if it is valid
             * exception response, otherwise proceed with the original content.
             */
            if (Option.isSome(exceptionResponse)) {
              return exceptionResponse.value
            }

            /**
             * If request accept is JSON then encode the content
             * using the SuccessResponse schema and return it as the response content.
             */
            if (accepts === 'json') {
              const successResponse = yield* makeResponseService.makeSuccessResponse()(content)
              ctx.response.status(successResponse.status)
              return yield* Effect.suspend(() =>
                Schema.encode(SuccessResponse, { errors: 'all' })(successResponse).pipe(
                  SchemaError.fromParseError('Unexpected error occurred while encoding success response.'),
                ),
              ).pipe(telemetry.withTelemetrySpan('encode_success_response'))
            }

            /**
             * If request accept is not JSON then return the original content
             * as the response content.
             */
            ctx.response.safeStatus(StatusCodes.OK)
            return content
          }).pipe(telemetry.withTelemetrySpan('wrap_response_in_standardized_format'))
        }).pipe(telemetry.withScopedTelemetry('response_wrapper_middleware'))
      })

      const response = await ApplicationRuntime.runPromise(
        pipe(
          program,
          Effect.provide(HttpContext.provide(ctx)),
        ),
      )

      return ctx.response.send(response)
    }
  }
}
