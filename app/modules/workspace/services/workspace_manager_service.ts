import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type { WorkspaceModelFields } from '#models/workspace_model'
import type CreateWorkspacePayload from '#modules/workspace/payloads/workspace_manager/create_workspace_payload'
import type DeleteWorkspacePayload from '#modules/workspace/payloads/workspace_manager/delete_workspace_payload'
import type ListWorkspacePayload from '#modules/workspace/payloads/workspace_manager/list_workspace_payload'
import type RetrieveWorkspaceDetailsPayload from '#modules/workspace/payloads/workspace_manager/retrieve_workspace_details_payload'
import type UpdateWorkspaceDetailsPayload from '#modules/workspace/payloads/workspace_manager/update_workspace_details_payload'
import type { WorkspaceSlug } from '#shared/schemas/workspace/workspace_attributes'
import { DataSource } from '#constants/data_source'
import DatabaseService from '#core/database/services/database_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import LucidUtilityService from '#core/lucid/services/lucid_utility_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import ResourceAlreadyExistsException from '#exceptions/resource_already_exists_exception'
import Workspace from '#models/workspace_model'
import { WorkspaceMemberRole } from '#modules/workspace/constants/workspace_member_role'
import EnsureWorkspaceLogoPayload from '#modules/workspace/payloads/workspace_manager/ensure_workspace_logo_payload'
import AddWorkspaceMemberPayload from '#modules/workspace/payloads/workspace_member/add_workspace_member_payload'
import WorkspaceMemberService from '#modules/workspace/services/workspace_member_service'
import WorkspaceUtilityService from '#modules/workspace/services/workspace_utility_service'
import HashService from '#shared/common/services/hash_service'
import { RetrieveWorkspaceUsingSlug } from '#shared/retrieval_strategies/workspace_retrieval_strategy'
import { UserPrimaryIdentifier } from '#shared/schemas/user/user_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import StorageService from '#shared/storage/services/storage_service'
import { Effect, Match, Option, pipe } from 'effect'
import { defaultTo } from 'lodash-es'

export default class WorkspaceManagerService extends Effect.Service<WorkspaceManagerService>()('@service/modules/workspace/workspace_manager', {
  dependencies: [
    DatabaseService.Default,
    ErrorConversionService.Default,
    HashService.Default,
    LucidModelRetrievalService.Default,
    LucidUtilityService.Default,
    StorageService.Default,
    WorkspaceMemberService.Default,
    WorkspaceUtilityService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const errorConversion = yield* ErrorConversionService
    const lucidModelRetrieval = yield* LucidModelRetrievalService
    const lucidUtility = yield* LucidUtilityService
    const telemetry = yield* TelemetryService

    const workspaceMemberService = yield* WorkspaceMemberService
    const workspaceUtilityService = yield* WorkspaceUtilityService

    function availability(slug: WorkspaceSlug) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        return yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingSlug,
            retrieve => retrieve(slug),
            {
              select: ['uid'],
              query: { client: trx },
            },
          ),
          lucidModelRetrieval.retrieve,
          Effect.map(
            Option.match({
              onNone: () => 'available' as const,
              onSome: () => 'unavailable' as const,
            }),
          ),
        )
      }).pipe(
        telemetry.withTelemetrySpan('workspace_slug_availability', {
          attributes: {
            workspace_slug: slug.value,
          },
        }),
      )
    }

    function create(payload: ProcessedDataPayload<CreateWorkspacePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Checks if the workspace slug is available before creating a new workspace.
         * If the slug is unavailable, it raises a ResourceAlreadyExistsException.
         */
        yield* pipe(
          availability(payload.workspace.slug),
          Effect.flatMap(status => Effect.gen(function* () {
            if (status === 'unavailable') {
              return yield* new ResourceAlreadyExistsException({ data: { resource: 'workspace' } })
            }
          })),
          Effect.asVoid,
        )

        /**
         * Create a workspace identifier using the Lucid utility service.
         */
        const workspaceIdentifier = yield* pipe(
          lucidUtility.generateIdentifier,
          Effect.map(id => WorkspaceIdentifier.make(id)),
        )

        /**
         * Generate a new workspace generic logo if not provided.
         */
        const logo = yield* pipe(
          DataSource.known({
            workspace: {
              identifier: workspaceIdentifier,
              name: payload.workspace.name,
            },
          }),
          EnsureWorkspaceLogoPayload.fromSource(),
          Effect.flatMap(workspaceUtilityService.ensureLogo),
        )

        /**
         * Create a new workspace in the database.
         */
        const workspace = yield* Effect.tryPromise({
          try: async () => {
            return await Workspace.create(
              {
                uid: workspaceIdentifier.value,
                name: payload.workspace.name,
                slug: payload.workspace.slug.value,
                website: payload.workspace.website,
                logoUrl: logo.url,
              } satisfies Partial<WorkspaceModelFields>,
              {
                client: trx,
              },
            )
          },
          catch: errorConversion.toUnknownError('Unexpected error while creating workspace.'),
        })

        /**
         * Add the user to the workspace as a member with owner role.
         */
        yield* pipe(
          DataSource.known({
            workspace,
            members: {
              user_identifier_or_primary_identifier: UserPrimaryIdentifier.make(payload.user.id),
              role: WorkspaceMemberRole.OWNER,
            },
          }),
          AddWorkspaceMemberPayload.fromSource(),
          Effect.flatMap(workspaceMemberService.add),
        )

        /**
         * Sets the user's default workspace ID based on the provided payload.
         */
        Match.value(payload.set_default_workspace).pipe(
          Match.when('safe_set', () => { payload.user.defaultWorkspaceId = defaultTo(payload.user.defaultWorkspaceId, workspace.id) }),
          Match.when(true, () => { payload.user.defaultWorkspaceId = workspace.id }),
          Match.orElse(() => {}),
        )

        /**
         * Saves the user with the updated default workspace ID.
         */
        yield* Match.value(payload.set_default_workspace).pipe(
          Match.whenOr(true, 'safe_set', () => Effect.tryPromise({
            try: async () => {
              payload.user.useTransaction(trx)
              return await payload.user.save()
            },
            catch: errorConversion.toUnknownError('Unexpected error while setting the default workspace for the user.'),
          })),
          Match.orElse(() => Effect.void),
        )

        return workspace
      })
    }

    function list(payload: ProcessedDataPayload<ListWorkspacePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve all workspaces for the authenticated user
         */
        const workspaces = yield* Effect.tryPromise({
          try: async () => {
            return await Workspace.query({ client: trx })
              .whereExists((subQuery) => {
                subQuery
                  .from('workspace_members')
                  .whereRaw('workspace_members.workspace_id = workspaces.id')
                  .where('workspace_members.user_id', '=', payload.user_identifier)
              })
              .orderBy('created_at', 'desc')
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving workspaces.'),
        }).pipe(telemetry.withTelemetrySpan('list_workspaces'))

        return workspaces
      })
    }

    function details(payload: ProcessedDataPayload<RetrieveWorkspaceDetailsPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the workspace using the provided identifier
         */
        const workspace = yield* Effect.tryPromise({
          try: async () => {
            return await Workspace.query({ client: trx })
              .where('uid', payload.workspace_identifier.value)
              .first()
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving workspace details.'),
        }).pipe(telemetry.withTelemetrySpan('retrieve_workspace_details'))

        if (!workspace) {
          throw new Error(`Workspace with identifier ${payload.workspace_identifier.value} not found.`)
        }

        return workspace
      })
    }

    function update(payload: ProcessedDataPayload<UpdateWorkspaceDetailsPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the workspace using the provided identifier
         */
        const workspace = yield* Effect.tryPromise({
          try: async () => {
            return await Workspace.query({ client: trx })
              .where('uid', payload.workspace_identifier.value)
              .first()
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving workspace for update.'),
        }).pipe(telemetry.withTelemetrySpan('retrieve_workspace_for_update'))

        if (!workspace) {
          throw new Error(`Workspace with identifier ${payload.workspace_identifier.value} not found.`)
        }

        /**
         * Update the workspace with the provided data
         */
        if (payload.mode === 'replace') {
          workspace.name = payload.details.name
          workspace.website = payload.details.website ?? null
          workspace.industry = payload.details.industry ?? null
          if (payload.details.logo) {
            // TODO: Handle logo upload
          }
        } else if (payload.mode === 'partial') {
          if (payload.details.name) {
            workspace.name = payload.details.name
          }
          if (payload.details.website !== undefined) {
            workspace.website = payload.details.website
          }
          if (payload.details.industry !== undefined) {
            workspace.industry = payload.details.industry
          }
          if (payload.details.logo) {
            // TODO: Handle logo upload
          }
        }

        /**
         * Save the updated workspace
         */
        yield* Effect.tryPromise({
          try: async () => {
            workspace.useTransaction(trx)
            return await workspace.save()
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while updating workspace.'),
        }).pipe(telemetry.withTelemetrySpan('update_workspace'))

        return workspace
      })
    }

    function remove(payload: ProcessedDataPayload<DeleteWorkspacePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the workspace using the provided identifier
         */
        const workspace = yield* Effect.tryPromise({
          try: async () => {
            return await Workspace.query({ client: trx })
              .where('uid', payload.workspace_identifier.value)
              .first()
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving workspace for deletion.'),
        }).pipe(telemetry.withTelemetrySpan('retrieve_workspace_for_deletion'))

        if (!workspace) {
          throw new Error(`Workspace with identifier ${payload.workspace_identifier.value} not found.`)
        }

        /**
         * Delete the workspace
         */
        yield* Effect.tryPromise({
          try: async () => {
            workspace.useTransaction(trx)
            return await workspace.delete()
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while deleting workspace.'),
        }).pipe(telemetry.withTelemetrySpan('delete_workspace'))

        return workspace
      })
    }

    return {
      availability,
      create,
      list,
      details,
      update,
      remove,
    }
  }),
}) {}
