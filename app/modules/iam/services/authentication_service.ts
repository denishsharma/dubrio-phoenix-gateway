import HttpContext from '#core/http/contexts/http_context'
import UnauthorizedException from '#modules/iam/exceptions/unauthorized_exception'
import { Effect } from 'effect'

export default class AuthenticationService extends Effect.Service<AuthenticationService>()('@service/modules/iam/authentication', {
  effect: Effect.gen(function* () {
    const getAuthenticatedUser = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context

      return yield* Effect.sync(() => ctx.auth.user).pipe(
        Effect.flatMap((user) => {
          if (!user) { return Effect.fail(new UnauthorizedException()) }
          return Effect.succeed(user)
        }),
      )
    })

    return {
      getAuthenticatedUser,
    }
  }),
}) {}
