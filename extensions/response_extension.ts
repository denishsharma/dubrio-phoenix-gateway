import type { ResponseDataMode } from '#core/http/constants/response_data_mode'
import type { Draft, Immutable } from 'mutative'
import type { PartialDeep, ReadonlyDeep, UnknownRecord } from 'type-fest'
import { Response } from '@adonisjs/core/http'
import { defu } from 'defu'
import { create } from 'mutative'

export const APPLICATION_RESPONSE_CONTEXT_MARKER: unique symbol = Symbol('@marker/extensions/response/application_response_context')

/**
 * Application response context that is stores in the response object
 * and is used to store additional information about the response.
 */
export interface ApplicationResponseContext {
  /**
   * Indicates whether the response should skip the default
   * response wrapping or not. This is useful when you want to
   * send a response without the default response wrapping.
   */
  skipResponseWrapping: boolean;

  /**
   * The message to be sent in the response content and this is different
   * from the status message. This is used to send a custom message
   * in the response content.
   */
  message: string | undefined;

  /**
   * The response data mode to be used for the response.
   */
  dataMode: ResponseDataMode | undefined;

  /**
   * Additional metadata to be sent in the response content
   * to be used by the client or the application.
   */
  metadata: UnknownRecord;
}

export interface ApplicationResponseContextAccessor {
  /**
   * Access the application response context.
   *
   * This is a read-only accessor that returns the current
   * application response context.
   *
   * To update the application response context, use the `update` method.
   */
  value: Immutable<ApplicationResponseContext>;

  /**
   * Update the application response context with the given updater function
   * that receives the current application response context.
   */
  update: (updater: (draft: Draft<ApplicationResponseContext>) => void) => void;
}

/**
 * Returns a new application response context with the given context
 * or the default context if no context is provided.
 */
function resolveResponseContext(ctx: PartialDeep<ApplicationResponseContext> = {}): ApplicationResponseContext {
  return defu(
    ctx,
    {
      skipResponseWrapping: false,
      message: undefined,
      dataMode: undefined,
      metadata: {},
    } satisfies ApplicationResponseContext,
  )
}

/**
 * Return the updated application response context with the given updater function
 * that receives the current application response context.
 */
function updateResponseContext(ctx: ApplicationResponseContext, updater: (draft: Draft<ApplicationResponseContext>) => void) {
  return create(ctx, updater)
}

/**
 * Register the getter in the response object to access the application response context
 * and the method to update the context.
 */
Response.getter('context', function (this: Response) {
  const ctx = resolveResponseContext(this[APPLICATION_RESPONSE_CONTEXT_MARKER])

  return {
    value: create(ctx, () => {}, { enableAutoFreeze: true }),
    update: (updater: (draft: Draft<ApplicationResponseContext>) => void) => {
      const context = updateResponseContext(ctx, updater)
      this[APPLICATION_RESPONSE_CONTEXT_MARKER] = context
    },
  }
})

/**
 * Augment the response object with the application response context
 * and the methods to access and update the context.
 */
declare module '@adonisjs/core/http' {
  interface Response {
    [APPLICATION_RESPONSE_CONTEXT_MARKER]: ReadonlyDeep<ApplicationResponseContext>;
    context: ApplicationResponseContextAccessor;
  }
}
