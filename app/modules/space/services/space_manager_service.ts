import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type { SpaceModelFields } from '#models/space_model'
import type CreateSpacePayload from '#modules/space/payloads/space_manager/create_space_payload'
import type DeleteSpacePayload from '#modules/space/payloads/space_manager/delete_space_payload'
import type ListSpacePayload from '#modules/space/payloads/space_manager/list_space_payload'
import type RetrieveSpaceDetailsPayload from '#modules/space/payloads/space_manager/retrieve_space_details_payload'
import type UpdateSpacePayload from '#modules/space/payloads/space_manager/update_space_payload'
import DatabaseService from '#core/database/services/database_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import ResourceNotFoundException from '#exceptions/resource_not_found_exception'
import AuthenticationService from '#modules/iam/services/authentication_service'
import { RetrieveSpaceUsingIdentifier } from '#shared/retrieval_strategies/space_retrieval_strategy'
import { RetrieveWorkspaceUsingIdentifier } from '#shared/retrieval_strategies/workspace_retrieval_strategy'
import { Effect, pipe } from 'effect'

export default class SpaceService extends Effect.Service<SpaceService>()('@service/modules/space', {
  dependencies: [
    AuthenticationService.Default,
    DatabaseService.Default,
    ErrorConversionService.Default,
    LucidModelRetrievalService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const errorConversion = yield* ErrorConversionService
    const lucidModelRetrieval = yield* LucidModelRetrievalService
    const telemetry = yield* TelemetryService

    function createSpace(payload: ProcessedDataPayload<CreateSpacePayload>) {
      return Effect.gen(function* () {
        /**
         * Create a space for the workspace.
         */
        const space = yield* Effect.tryPromise({
          try: async () => {
            return await payload.workspace
              .related('spaces')
              .create({
                name: payload.space.name,
                tag: payload.space.tag,
                createdBy: payload.user.id,
                icon: payload.space.icon,
              } satisfies Partial<SpaceModelFields>)
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while creating the space.'),
        }).pipe(telemetry.withTelemetrySpan('create_space_for_workspace'))

        /**
         * Attach the user to the space.
         * This is done to ensure that the user who created the space
         * is also a member of the space.
         */
        yield* Effect.tryPromise({
          try: () => payload.user.related('spaces').attach([space.id]),
          catch: errorConversion.toUnknownError('Unexpected error occurred while attaching the user to the space.'),
        }).pipe(telemetry.withTelemetrySpan('attach_user_to_space'))

        return space
      }).pipe(telemetry.withTelemetrySpan('create_space'))
    }

    function list(payload: ProcessedDataPayload<ListSpacePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the workspace using the provided identifier from the payload.
         */
        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(payload.workspace_identifier),
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

        // TODO: Implement the bouncer logic to check if the user has access to the workspace

        /**
         * List all spaces for the workspace.
         */
        return yield* Effect.tryPromise({
          try: () => workspace
            .related('spaces')
            .query(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while listing all spaces.'),
        }).pipe(telemetry.withTelemetrySpan('list_all_spaces_for_workspace'))
      })
    }

    function details(payload: ProcessedDataPayload<RetrieveSpaceDetailsPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the workspace using the provided identifier from the payload.
         */
        // const workspace = yield* pipe(
        //   WithRetrievalStrategy(
        //     RetrieveWorkspaceUsingIdentifier,
        //     retrieve => retrieve(payload.workspace_identifier),
        //     {
        //       exception: {
        //         throw: true,
        //       },
        //       query: {
        //         client: trx,
        //       },
        //     },
        //   ),
        //   lucidModelRetrieval.retrieve,
        // )

        // TODO: Implement the bouncer logic to check if the user has access to the workspace

        /**
         * Retrieve the space by identifier from the workspace.
         *
         * TODO: use retrieval strategy to fetch the space using identifier and then check if the user has access to the space.
         */
        // const space = yield* Effect.tryPromise({
        //   try: () => workspace
        //     .related('spaces')
        //     .query()
        //     .where('uid', payload.space_identifier.value)
        //     .andWhere('workspace_id', workspace.id)
        //     .first(),
        //   catch: errorConversion.toUnknownError('Unexpected error occurred while fetching the space details.'),
        // }).pipe(telemetry.withTelemetrySpan('fetch_space_details'))

        const space = yield* pipe(
          WithRetrievalStrategy(
            RetrieveSpaceUsingIdentifier,
            retrieve => retrieve(payload.space_identifier),
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
          Effect.flatMap((data) => {
            if (!data) {
              throw new ResourceNotFoundException({ data: { resource: 'space' } })
            }
            return Effect.succeed(data)
          }),
        )

        return space
      }).pipe(telemetry.withTelemetrySpan('retrieve_space_details', { attributes: { space_identifier: payload.space_identifier } }))
    }

    function updateSpace(payload: ProcessedDataPayload<UpdateSpacePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the workspace using the provided identifier from the payload.
         */
        // const workspace = yield* pipe(
        //   WithRetrievalStrategy(
        //     RetrieveWorkspaceUsingIdentifier,
        //     retrieve => retrieve(payload.workspace_identifier),
        //     {
        //       exception: {
        //         throw: true,
        //       },
        //       query: {
        //         client: trx,
        //       },
        //     },
        //   ),
        //   lucidModelRetrieval.retrieve,
        // )

        /**
         * Fetch the space by identifier from the workspace.
         */
        // const space = yield* Effect.tryPromise({
        //   try: () => workspace
        //     .related('spaces')
        //     .query()
        //     .where('uid', payload.space_identifier.value)
        //     .andWhere('workspace_id', workspace.id)
        //     .first(),
        //   catch: errorConversion.toUnknownError('Unexpected error occurred while fetching the space for update.'),
        // }).pipe(telemetry.withTelemetrySpan('fetch_space_for_update'))

        // if (!space) {
        //   throw new SpaceAccessDeniedException(`Space with identifier ${payload.space_identifier.value} not found in the specified workspace.`)
        // }

        const space = yield* pipe(
          WithRetrievalStrategy(
            RetrieveSpaceUsingIdentifier,
            retrieve => retrieve(payload.space_identifier),
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
          Effect.flatMap((data) => {
            if (!data) {
              throw new ResourceNotFoundException({ data: { resource: 'space' } })
            }
            return Effect.succeed(data)
          }),
        )

        /**
         * Update the space with the provided data.
         */
        if (payload.mode === 'replace') {
          space.name = payload.data.name
          space.tag = payload.data.tag
          space.icon = payload.data.icon ?? null
        } else if (payload.mode === 'partial') {
          if (payload.data.name) {
            space.name = payload.data.name
          }
          if (payload.data.tag) {
            space.tag = payload.data.tag
          }
          if (payload.data.icon) {
            space.icon = payload.data.icon
          }
        }

        /**
         * Save the updated space.
         */
        yield* Effect.tryPromise({
          try: () => space.save(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while updating the space.'),
        }).pipe(telemetry.withTelemetrySpan('update_space'))

        return space
      })
    }

    function deleteSpace(payload: ProcessedDataPayload<DeleteSpacePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the workspace using the provided identifier from the payload.
         */
        // const workspace = yield* pipe(
        //   WithRetrievalStrategy(
        //     RetrieveWorkspaceUsingIdentifier,
        //     retrieve => retrieve(payload.workspace_identifier),
        //     {
        //       exception: {
        //         throw: true,
        //       },
        //       query: {
        //         client: trx,
        //       },
        //     },
        //   ),
        //   lucidModelRetrieval.retrieve,
        // )

        /**
         * Fetch the space by identifier from the workspace.
         */
        const space = yield* pipe(
          WithRetrievalStrategy(
            RetrieveSpaceUsingIdentifier,
            retrieve => retrieve(payload.space_identifier),
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
          Effect.flatMap((data) => {
            if (!data) {
              throw new ResourceNotFoundException({ data: { resource: 'space' } })
            }
            return Effect.succeed(data)
          }),
        )

        /**
         * Delete the space.
         */
        yield* Effect.tryPromise({
          try: () => space.delete(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while deleting the space.'),
        }).pipe(telemetry.withTelemetrySpan('delete_space'))

        return space
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
       * This will return an array of spaces with their identifier, name, tag, icon, and createdAt.
       * This is useful for displaying all spaces in the UI.
       */
      list,

      /**
       * Retrieve the details of a space using the provided payload.
       *
       * @param payload - The payload containing the space identifier.
       */
      details,

      /**
       * Update a space with the provided payload.
       * This will contain patch and put semantics
       * - For patch, it will update only the fields that are provided in the payload.
       * - For put, it will update all fields with the provided data.
       *
       * @param payload - The payload containing the space identifier, mode['patch' | 'put'], and the data to update.
       */
      updateSpace,

      /**
       * Delete a space by its identifier.
       * This will delete the space from the active workspace.
       *
       * @param payload - The payload containing the space identifier.
       */
      deleteSpace,
    }
  }),
}) {}
