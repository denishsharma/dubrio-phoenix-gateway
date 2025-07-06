import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import HttpContextUnavailableError from '#core/http/errors/http_context_unavailable_error'
import is from '@adonisjs/core/helpers/is'
import { Context, Effect, Layer } from 'effect'

/**
 * The HTTP context to hold the HTTP context of the AdonisJs framework and
 * provide it to the current scope of execution of the effect.
 */
export default class HttpContext extends Context.Tag('@context/core/http/context')<HttpContext, {
  /**
   * Indicates whether the HTTP context is available in the current scope
   * of execution of the effect.
   */
  readonly available: boolean;

  /**
   * Effect to retrieve the HTTP context to the current scope of execution
   * of the effect.
   *
   * @see {@link FrameworkHttpContext} for more information about the HTTP context of the AdonisJs framework.
   */
  readonly context: Effect.Effect<FrameworkHttpContext, HttpContextUnavailableError, never>;
}>() {
  /**
   * Provides the HTTP context to the current scope of execution
   * of the effect.
   *
   * @param context - The HTTP context to provide to the current scope of execution of the effect.
   */
  static readonly provide = (context?: FrameworkHttpContext) => {
    return Layer.effect(
      HttpContext,
      Effect.gen(function* () {
        return {
          available: is.nullOrUndefined(context) === false,
          context: Effect.gen(function* () {
            if (!is.nullOrUndefined(context)) {
              return context
            }
            return yield* new HttpContextUnavailableError()
          }),
        }
      }),
    )
  }
}
