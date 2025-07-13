import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type { SpaceModelFields } from '#models/space_model'
import type CreateSpacePayload from '#modules/space/payloads/create_space_payload'
import DatabaseService from '#core/database/services/database_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import QueueJobService from '#core/queue_job/services/queue_job_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import AuthenticationService from '#modules/iam/services/authentication_service'
import StringMixerService from '#shared/common/services/string_mixer_service'
import { RetrieveActiveWorkspace } from '#shared/retrieval_strategies/workspace_retrieval_strategy'
import { Effect, pipe } from 'effect'

export default class SpaceService extends Effect.Service<SpaceService>()('@service/modules/space', {
  dependencies: [
    AuthenticationService.Default,
    DatabaseService.Default,
    ErrorConversionService.Default,
    LucidModelRetrievalService.Default,
    QueueJobService.Default,
    StringMixerService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const errorConversion = yield* ErrorConversionService
    const lucidModelRetrieval = yield* LucidModelRetrievalService
    const telemetry = yield* TelemetryService

    const authenticationService = yield* AuthenticationService

    function createSpace(payload: ProcessedDataPayload<CreateSpacePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the authenticated user.
         */
        const user = yield* authenticationService.getAuthenticatedUser

        /**
         * Retrieve the active workspace.
         * If no active workspace is found, throw an error.
         */
        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveActiveWorkspace,
            retrieve => retrieve(),
            {
              exception: {
                throw: true,
              },
              query: {
                client: trx,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
        )

        /**
         * Create a space for the active workspace.
         */
        const space = yield* Effect.tryPromise({
          try: async () => {
            return await workspace
              .related('spaces')
              .create({
                name: payload.name,
                tag: payload.tag,
                createdBy: user.id,
                avatarUrl: payload.avatar_url,
              } satisfies Partial<SpaceModelFields>)
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while creating the space.'),
        }).pipe(telemetry.withTelemetrySpan('create_space_for_active_workspace'))

        /**
         * Attach the user to the space.
         * This is done to ensure that the user who created the space
         * is also a member of the space.
         */
        yield* Effect.tryPromise({
          try: () => user.related('spaces').attach([space.id]),
          catch: errorConversion.toUnknownError('Unexpected error occurred while attaching the user to the space.'),
        }).pipe(telemetry.withTelemetrySpan('attach_user_to_space'))

        return space
      }).pipe(telemetry.withTelemetrySpan('create_space'))
    }

    function listAllSpaces() {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        /**
         * Retrieve the active workspace.
         * If no active workspace is found, throw an error.
         */
        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveActiveWorkspace,
            retrieve => retrieve(),
            {
              exception: {
                throw: true,
              },
              query: {
                client: trx,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
        )

        /**
         * List all spaces for the active workspace.
         */
        const spaces = yield* Effect.tryPromise({
          try: () => workspace
            .related('spaces')
            .query(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while listing all spaces.'),
        }).pipe(telemetry.withTelemetrySpan('list_all_spaces_for_active_workspace'))

        /**
         * Format the spaces to return only the required fields.
         */
        const formattedSpaces = yield* Effect.forEach(
          spaces,
          space => Effect.sync(() => ({
            identifier: space.uid,
            name: space.name,
            tag: space.tag,
            avatarUrl: space.avatarUrl,
            createdAt: space.createdAt.toISO(),
          })),
        )

        return formattedSpaces
      })
    }

    return {
      /**
       * Create a space using the provided payload and for the authenticated user
       * with active workspace.
       *
       * This will also attach the user to the space as a member.
       *
       * @param payload - The payload containing the space details.
       */
      createSpace,

      /**
       * List all spaces for the active workspace.
       * This will return an array of spaces with their identifier, name, tag, avatarUrl, and createdAt.
       * This is useful for displaying all spaces in the UI.
       */
      listAllSpaces,
    }
  }),
}) {}
