import type { RequestValidationOptions } from '@adonisjs/core/types/http'
import type { VineValidator } from '@vinejs/vine'
import type { SchemaTypes } from '@vinejs/vine/types'
import type { UnknownRecord } from 'type-fest'
import HttpContext from '#core/http/contexts/http_context'
import VineValidationService from '#core/validation/services/vine_validation_service'
import { Effect, Option, pipe } from 'effect'
import { defaultTo } from 'lodash-es'

/**
 * Type that represents the merged request data
 * from the request body, params, cookies, headers and query string.
 */
export interface MergedRequestData extends UnknownRecord {
  __params: UnknownRecord;
  __cookies: UnknownRecord;
  __headers: UnknownRecord;
  __qs: UnknownRecord;
}

export default class HttpRequestService extends Effect.Service<HttpRequestService>()('@service/core/http/request', {
  dependencies: [VineValidationService.Default],
  effect: Effect.gen(function* () {
    const vineValidation = yield* VineValidationService

    const getCurrentRequestId = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context

      return Option.fromNullable(ctx.request.id())
    })

    const getRequestData = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context

      return yield* Effect.suspend(() =>
        Effect.succeed(
          Option.fromNullable({
            ...ctx.request.all(),
            ...ctx.request.allFiles(),
            __params: defaultTo(ctx.request.params(), {}),
            __cookies: defaultTo(ctx.request.cookiesList(), {}),
            __headers: defaultTo(ctx.request.headers() as UnknownRecord, {}),
            __qs: defaultTo(ctx.request.qs(), {}),
          } satisfies MergedRequestData as MergedRequestData),
        ),
      )
    })

    function validateRequestData<S extends SchemaTypes, M extends undefined | Record<string, any>>(
      validator: VineValidator<S, M>,
      ...[options]: [undefined] extends M ? [options?: RequestValidationOptions<M> | undefined] : [options: RequestValidationOptions<M>]
    ) {
      return Effect.suspend(() => pipe(
        getRequestData,
        Effect.map(
          Option.match({
            onNone: () => ({}),
            onSome: data => data,
          }),
        ),
        Effect.flatMap(
          vineValidation.validate<S, M>(
            validator,
            {
              validator: options as any,
              exception: {
                validation: 'Validation error occurred while validating the request data.',
                unknown: 'Unknown error occurred while validating the request data.',
              },
            },
          ),
        ),
      ))
    }

    return {
      /**
       * Retrieves the request ID from the current request context.
       */
      getCurrentRequestId,

      /**
       * Retrieves the request data from the current request context
       * and merges it with the request body, params, cookies, headers and query string.
       */
      getRequestData,

      /**
       * Validates the request data using the provided validator
       * using the Vine validation library.
       *
       * @param validator - The Vine validator to use for validation.
       * @param options - The options to use for validation.
       */
      validateRequestData,
    }
  }),
}) {}
