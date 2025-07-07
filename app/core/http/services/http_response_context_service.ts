import type { ResponseDataMode } from '#core/http/constants/response_data_mode'
import type { ApplicationResponseContext } from '#extensions/response_extension'
import type { StatusCodes } from 'http-status-codes'
import type { Draft } from 'mutative'
import type { UnknownRecord } from 'type-fest'
import HttpContext from '#core/http/contexts/http_context'
import { DefaultResponseMetadataDetails } from '#core/http/schemas/response_metadata_schema'
import { defu } from 'defu'
import { Effect, Record } from 'effect'
import { omit, pick } from 'lodash-es'

export default class HttpResponseContextService extends Effect.Service<HttpResponseContextService>()('@service/core/http/response_context', {
  effect: Effect.gen(function* () {
    const getContextObject = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context
      return ctx.response.context
    })

    const updateContext = (updater: (draft: Draft<ApplicationResponseContext>) => void) => Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context
      ctx.response.context.update(updater)
    })

    const annotateMetadata = (metadata: UnknownRecord) => Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context
      const data = defu(omit(metadata, Record.keys(DefaultResponseMetadataDetails.fields)), ctx.response.context.value.metadata)
      ctx.response.context.update((draft) => { draft.metadata = data })
    })

    const setMetadata = (metadata: UnknownRecord) => Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context
      const data = defu(pick(ctx.response.context.value.metadata, Record.keys(DefaultResponseMetadataDetails.fields)), metadata)
      ctx.response.context.update((draft) => { draft.metadata = data })
    })

    const getMetadata = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context
      return ctx.response.context.value.metadata
    })

    const setDataMode = Effect.fn(function* (dataMode: ResponseDataMode) {
      const { context } = yield* HttpContext
      const ctx = yield* context
      ctx.response.context.update((draft) => { draft.dataMode = dataMode })
    })

    const getDataMode = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context
      return ctx.response.context.value.dataMode
    })

    const setMessage = Effect.fn(function* (message: string) {
      const { context } = yield* HttpContext
      const ctx = yield* context
      ctx.response.context.update((draft) => { draft.message = message })
    })

    const getMessage = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context
      return ctx.response.context.value.message
    })

    const setStatus = Effect.fn(function* (status: StatusCodes) {
      const { context } = yield* HttpContext
      const ctx = yield* context
      ctx.response.status(status)
    })

    const getSkipResponseWrapping = Effect.gen(function* () {
      const { context } = yield* HttpContext
      const ctx = yield* context
      return ctx.response.context.value.skipResponseWrapping
    })

    const setSkipResponseWrapping = Effect.fn(function* (skip: boolean) {
      const { context } = yield* HttpContext
      const ctx = yield* context
      ctx.response.context.update((draft) => { draft.skipResponseWrapping = skip })
    })

    return {
      /**
       * Get the response context object.
       */
      getContextObject,

      /**
       * Update the response context with the given updater function.
       *
       * @param updater - The updater function to update the response context.
       */
      updateContext,

      /**
       * Annotate the response metadata with the given metadata.
       *
       * This will merge the given metadata with the existing metadata in the response context
       * and override the existing metadata.
       *
       * @param metadata - The metadata to annotate with.
       */
      annotateMetadata,

      /**
       * Set the response metadata with the given metadata.
       *
       * This will replace the existing metadata in the response context
       * with the given metadata except for the default metadata fields.
       *
       * @param metadata - The metadata to set.
       */
      setMetadata,

      /**
       * Get the response metadata from the response context.
       */
      getMetadata,

      /**
       * Set the response data mode with the given data mode.
       *
       * @param dataMode - The data mode to set.
       */
      setDataMode,

      /**
       * Get the response data mode from the response context.
       */
      getDataMode,

      /**
       * Set the response message with the given message.
       *
       * @param message - The message to set.
       */
      setMessage,

      /**
       * Get the response message from the response context.
       */
      getMessage,

      /**
       * Set the response status with the given status code.
       *
       * @param status - The status code to set.
       */
      setStatus,

      /**
       * Get the skip response wrapping flag from the response context.
       *
       * This indicates whether the response should skip the default
       * response wrapping or not. This is useful when you want to
       * send a response without the default response wrapping.
       */
      getSkipResponseWrapping,

      /**
       * Set the skip response wrapping flag in the response context.
       *
       * @param skip - The flag to set. If true, the response will skip the default response wrapping.
       */
      setSkipResponseWrapping,
    }
  }),
}) {}
