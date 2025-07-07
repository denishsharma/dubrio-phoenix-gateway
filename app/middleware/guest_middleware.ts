import type { Authenticators } from '@adonisjs/auth/types'
import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import NotGuestUserException from '#modules/iam/exceptions/not_guest_user_exception'
import { defu } from 'defu'
import { Effect } from 'effect'
import { defaultTo } from 'lodash-es'

interface GuestMiddlewareOptions {
  guards?: (keyof Authenticators)[];
}

/**
 * Guest middleware is used to deny access to routes that should
 * be accessed by unauthenticated users.
 *
 * For example, the login page should not be accessible if the user
 * is already logged-in
 *
 * @category Middleware
 */
export default class GuestMiddleware {
  async handle(ctx: FrameworkHttpContext, next: NextFn, options?: GuestMiddlewareOptions) {
    await Effect.gen(function* () {
      const errorConversion = yield* ErrorConversionService
      const telemetry = yield* TelemetryService

      return yield* Effect.gen(function* () {
        const resolvedOptions = defu(
          options,
          {
            guards: ['web', 'api'],
          } satisfies Partial<GuestMiddlewareOptions>,
        )

        yield* Effect.forEach(
          defaultTo(resolvedOptions.guards, [ctx.auth.defaultGuard]),
          guard => Effect.gen(function* () {
            return yield* new NotGuestUserException()
          }).pipe(Effect.whenEffect(
            Effect.tryPromise({
              try: async () => await ctx.auth.use(guard).check(),
              catch: errorConversion.toException('Unexpected error occurred while checking the authentication status.'),
            }),
          )),
          { discard: true },
        )
      }).pipe(
        telemetry.withTelemetrySpan('check_guest_user'),
        telemetry.withScopedTelemetry('guest_middleware'),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))

    return next()
  }
}
