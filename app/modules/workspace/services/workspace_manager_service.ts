import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type { WorkspaceModelFields } from '#models/workspace_model'
import type CreateWorkspacePayload from '#modules/workspace/payloads/workspace_manager/create_workspace_payload'
import type DeleteWorkspacePayload from '#modules/workspace/payloads/workspace_manager/delete_workspace_payload'
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

    function details(_payload: ProcessedDataPayload<RetrieveWorkspaceDetailsPayload>) {
      return Effect.gen(function* () {})
    }

    function update(_payload: ProcessedDataPayload<UpdateWorkspaceDetailsPayload>) {
      return Effect.gen(function* () {})
    }

    function remove(_payload: ProcessedDataPayload<DeleteWorkspacePayload>) {
      return Effect.gen(function* () {})
    }

    return {
      availability,
      create,
      details,
      update,
      remove,
    }
  }),
}) {}
