import type { Authenticators } from '@adonisjs/auth/types'
import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import UnauthorizedException from '#modules/iam/exceptions/unauthorized_exception'
import { errors } from '@adonisjs/auth'
import { defu } from 'defu'
import { Effect, Match } from 'effect'

/**
 * Options for the AuthenticationMiddleware.
 */
interface AuthenticationMiddlewareOptions {
  guards?: (keyof Authenticators)[];
}

/**
 * Authentication middleware is used to authenticate HTTP requests and deny
 * access to unauthenticated users.
 *
 * @category Middleware
 */
export default class AuthenticationMiddleware {
  async handle(ctx: FrameworkHttpContext, next: NextFn, options?: AuthenticationMiddlewareOptions) {
    await Effect.gen(function* () {
      const errorConversion = yield* ErrorConversionService
      const telemetry = yield* TelemetryService

      return yield* Effect.gen(function* () {
        const resolvedOptions = defu(
          options,
          {
            guards: ['web', 'api'],
          } as Partial<AuthenticationMiddlewareOptions>,
        )

        return yield* Effect.tryPromise({
          try: async () => await ctx.auth.authenticateUsing(resolvedOptions.guards),
          catch: Match.type<unknown>().pipe(
            Match.whenOr(
              Match.instanceOf(errors.E_UNAUTHORIZED_ACCESS),
              Match.instanceOf(errors.E_INVALID_CREDENTIALS),
              () => new UnauthorizedException(),
            ),
            Match.orElse(errorConversion.toException('Unexpected error occurred while authenticating the user.')),
          ),
        })
      }).pipe(
        telemetry.withTelemetrySpan('authenticate_user'),
        telemetry.withScopedTelemetry('authentication_middleware'),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))

    return next()
  }
}
