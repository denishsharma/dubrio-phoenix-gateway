import type SuccessResponse from '#core/http/schemas/success_response_schema'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import ExceptionResponse from '#core/http/schemas/exception_response_schema'
import env from '#start/env'
import { ApplicationRuntime } from '#start/runtime'
import { cuid } from '@adonisjs/core/helpers'
import is from '@adonisjs/core/helpers/is'
import opentelemetry from '@opentelemetry/api'
import { Effect, Either, Match, pipe, Schema } from 'effect'
import { getReasonPhrase } from 'http-status-codes'
import { defaultTo } from 'lodash-es'

export default class TelemetryMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Get the tracer from the OpenTelemetry API
     * and start a new span for the current request lifecycle
     */
    const tracer = opentelemetry.trace.getTracer(env.get('OTEL_APPLICATION_SERVICE_NAME'))

    /**
     * Generate a unique request ID for the current request
     * if it does not exists already
     */
    const currentRequestId = ctx.request.id() ?? cuid()
    if (is.nullOrUndefined(ctx.request.id())) {
      ctx.request.headers()['x-request-id'] = currentRequestId
    }

    /**
     * Start a new span for the current request lifecycle
     * and set the attributes for the current request span
     */
    const currentRequestSpan = tracer.startSpan(`${ctx.request.method().toUpperCase()} ${ctx.request.url()} [${currentRequestId}]`)
    currentRequestSpan.setAttributes({
      'http.method': ctx.request.method().toUpperCase(),
      'http.url': ctx.request.url(),
      'http.request_id': currentRequestId,
      'http.request_size': ctx.request.header('content-length'),
      'http.request_content_type': ctx.request.header('content-type'),
      'http.request_accept': ctx.request.header('accept'),
      'http.user_agent': ctx.request.header('user-agent'),
      'http.client_ip': ctx.request.ip(),
      'http.host': ctx.request.header('host'),
      'http.protocol': ctx.request.protocol(),
      'http.scheme': ctx.request.secure() ? 'https' : 'http',
    })

    try {
      await opentelemetry.context.with(opentelemetry.trace.setSpan(opentelemetry.context.active(), currentRequestSpan), async () => {
        /**
         * Execute the next middleware in the chain
         */
        return await next()
      })

      const isResponseOK = ctx.response.getStatus() >= 200 && ctx.response.getStatus() < 300

      /**
       * Match the response content type and set the span
       * attributes and status based on the response type
       */
      const program = Effect.gen(function* () {
        const typedEffect = yield* TypedEffectService

        return yield* pipe(
          Match.type<{ content: boolean; stream: boolean; fileToStream: boolean }>().pipe(
          /**
           * When the response has content.
           */
            Match.when(
              ({ content }) => content,
              () => Effect.gen(function* () {
                const content = ctx.response.content![0]
                const isExceptionResponse = Schema.decodeEither(ExceptionResponse)(content).pipe(
                  Either.match({
                    onLeft: () => false,
                    onRight: () => true,
                  }),
                )

                /**
                 * Match the response content type and set the span
                 * attributes and status based on the response type
                 */
                yield* Match.value(isExceptionResponse || !isResponseOK).pipe(
                  Match.when(true, () => Effect.sync(() => {
                    const status = ctx.response.getStatus()
                    const message = (content as typeof ExceptionResponse.Encoded).message

                    /**
                     * Set the response attributes for the current request span
                     * if the response is an exception response or the status
                     * code is not OK
                     */
                    currentRequestSpan.setAttributes({
                      'http.response_status': status,
                      'http.response_message': message,
                    })

                    /**
                     * Set the status of the current request span to error
                     * if the response is an exception response or the status
                     * code is not OK
                     */
                    currentRequestSpan.setStatus({
                      code: opentelemetry.SpanStatusCode.ERROR,
                      message,
                    })
                  })),

                  /**
                   * Set the response attributes for the current request span
                   * if the response is not an exception response and the status
                   * code is OK
                   */
                  Match.orElse(() => Effect.sync(() => {
                    const status = ctx.response.getStatus()
                    const message = defaultTo(defaultTo(ctx.response.context.value.message, (content as typeof SuccessResponse.Encoded).message), getReasonPhrase(status))

                    /**
                     * Set the response attributes for the current request span
                     * if the response is not an exception response and the status
                     * code is OK
                     */
                    currentRequestSpan.setAttributes({
                      'http.response_status': status,
                      'http.response_message': message,
                    })

                    /**
                     * Set the status of the current request span to OK
                     * if the response is not an exception response and the status
                     * code is OK
                     */
                    currentRequestSpan.setStatus({
                      message,
                      code: opentelemetry.SpanStatusCode.OK,
                    })
                  })),
                )
              }),
            ),

            /**
             * Otherwise, when the response is a stream or file stream.
             */
            Match.orElse(() => Effect.gen(function* () {
              const status = ctx.response.getStatus()
              const message = defaultTo(ctx.response.context.value.message, getReasonPhrase(status))

              /**
               * Set the response attributes for the current request span
               * if the response is a stream or a file stream
               */
              currentRequestSpan.setAttributes({
                'http.response_status': status,
                'http.response_message': message,
              })

              /**
               * Set the status of the current request span to OK
               * if the response is a stream or a file stream
               */
              currentRequestSpan.setStatus({
                message,
                code: isResponseOK ? opentelemetry.SpanStatusCode.OK : opentelemetry.SpanStatusCode.ERROR,
              })
            })),
          )({ content: ctx.response.hasContent, stream: ctx.response.hasStream, fileToStream: ctx.response.hasFileToStream }),
          typedEffect.ensureErrorType<never>(),
          typedEffect.ensureSuccessType<void>(),
        )
      })

      await ApplicationRuntime.runPromise(program)
    } catch (error) {
      /**
       * Set the status of the current request span to error
       * if there was an error while setting the span
       * and rethrow the error
       */
      currentRequestSpan.setStatus({
        code: opentelemetry.SpanStatusCode.ERROR,
        message: error.message,
      })

      throw error
    } finally {
      /**
       * End the current request span after the request
       * has been processed
       */
      currentRequestSpan.end()
    }
  }
}
