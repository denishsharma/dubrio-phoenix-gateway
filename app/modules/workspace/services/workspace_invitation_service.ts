import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type AcceptWorkspaceInvitationPayload from '#modules/workspace/payloads/workspace_invitation/accept_workspace_invitation_payload'
import type QueueWorkspaceInvitationEmailPayload from '#modules/workspace/payloads/workspace_invitation/queue_workspace_invitation_email_payload'
import type WorkspaceInvitationToken from '#modules/workspace/schemas/workspace_member/workspace_invitation_token'
import { CacheNamespace } from '#constants/cache_namespace'
import { DataSource } from '#constants/data_source'
import DatabaseService from '#core/database/services/database_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import { WithQueueJob } from '#core/queue_job/constants/with_queue_job'
import QueueJobService from '#core/queue_job/services/queue_job_service'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import ResourceNotFoundException from '#exceptions/resource_not_found_exception'
import User from '#models/user_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import AuthenticationService from '#modules/iam/services/authentication_service'
import { WorkspaceMemberStatus } from '#modules/workspace/constants/workspace_member_status'
import WorkspaceInviteException from '#modules/workspace/exceptions/workspace_invite_exception'
import SendWorkspaceInviteEmailJob from '#modules/workspace/jobs/send_workspace_invite_email_job'
import GenerateInvitationTokenDetailsPayload from '#modules/workspace/payloads/workspace_invitation/generate_invitation_token_details_payload'
import StringMixerService from '#shared/common/services/string_mixer_service'
import { RetrieveSpaceUsingIdentifier } from '#shared/retrieval_strategies/space_retrieval_strategy'
import { RetrieveUserUsingColumn, RetrieveUserUsingIdentifier } from '#shared/retrieval_strategies/user_retrieval_strategy'
import { RetrieveWorkspaceUsingIdentifier } from '#shared/retrieval_strategies/workspace_retrieval_strategy'
import { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import cache from '@adonisjs/cache/services/main'
import { Effect, pipe, Redacted, Schema } from 'effect'

export default class WorkspaceInvitationService extends Effect.Service<WorkspaceInvitationService>()('@service/modules/workspace/workspace_invitation', {
  dependencies: [TelemetryService.Default],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const errorConversion = yield* ErrorConversionService
    const lucidModelRetrieval = yield* LucidModelRetrievalService
    const queueJob = yield* QueueJobService
    const telemetry = yield* TelemetryService

    const stringMixer = yield* StringMixerService
    const authenticationService = yield* AuthenticationService

    function generateInvitationTokenDetails(payload: ProcessedDataPayload<GenerateInvitationTokenDetailsPayload>) {
      return Effect.gen(function* () {
        const tokenObj = yield* stringMixer.encode(payload.workspace_identifier.value, payload.invitee_email_address)

        const cachePayload = yield* pipe(
          {
            workspace_id: payload.workspace_identifier.value,
            sender_id: payload.invited_by_user_identifier.value,
            space_id: payload.space_identifier?.value,
            invitee_email: payload.invitee_email_address,
            token: {
              value: tokenObj.value,
              key: tokenObj.key,
            },
          },
          Schema.decode(
            Schema.Struct({
              workspace_id: Schema.ULID,
              sender_id: Schema.ULID,
              space_id: Schema.optional(Schema.ULID),
              invitee_email: Schema.String,
              token: Schema.Struct({
                value: Schema.String,
                key: Schema.String,
              }),
            }),
            { errors: 'all' },
          ),
          SchemaError.fromParseError('Unexpected error occurred while decoding the cache payload.'),
        )

        yield* Effect.tryPromise({
          try: () => cache
            .namespace(CacheNamespace.WORKSPACE_INVITE_TOKEN)
            .set({
              key: `${payload.workspace_identifier.value}_${payload.invitee_email_address}`,
              value: cachePayload,
              ttl: '1d',
            }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while caching invite token.'),
        })

        return {
          token: tokenObj,
        }
      }).pipe(telemetry.withTelemetrySpan('generate_invitation_token_details'))
    }

    function retrieveInvitationDetails(token: WorkspaceInvitationToken) {
      return Effect.gen(function* () {
        const decodedDetails = yield* stringMixer.decode(token.value.value, token.value.key)
        const { trx } = yield* database.requireTransaction()

        const cachedInvite = yield* Effect.tryPromise({
          try: () => cache
            .namespace(CacheNamespace.WORKSPACE_INVITE_TOKEN)
            .get({ key: decodedDetails[0] }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving cached invite token.'),
        })

        if (!cachedInvite) {
          return yield* new WorkspaceInviteException('Cached invite token not found.')
        }

        const cacheData = yield* pipe(
          cachedInvite,
          Schema.decodeUnknown(
            Schema.Struct({
              workspace_id: Schema.ULID,
              sender_id: Schema.ULID,
              invitee_email: Schema.String,
              token: Schema.Struct({
                value: Schema.String,
                key: Schema.String,
              }),
            }),
          ),
          SchemaError.fromParseError('Unexpected error occurred while decoding cached invite token.'),
        )

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(WorkspaceIdentifier.make(cacheData.workspace_id)),
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

        const invitedByUser = yield* pipe(
          WithRetrievalStrategy(
            RetrieveUserUsingIdentifier,
            retrieve => retrieve(UserIdentifier.make(cacheData.sender_id)),
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

        const responseData = {
          workspace: {
            id: workspace.uid,
            name: workspace.name,
            logo: workspace.logoUrl ? workspace.logoUrl : null,
          },
          invited_by_user: {
            id: invitedByUser.uid,
            first_name: invitedByUser.firstName,
            last_name: invitedByUser.lastName || '',
            email: invitedByUser.email,
          },
        }

        return responseData
      }).pipe(telemetry.withTelemetrySpan('retrieve_invitation_details'))
    }

    function queueInvitationEmail(payload: ProcessedDataPayload<QueueWorkspaceInvitationEmailPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

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

        const invitedByUser = yield* pipe(
          WithRetrievalStrategy(
            RetrieveUserUsingIdentifier,
            retrieve => retrieve(payload.invited_by_user_identifier),
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

        yield* Effect.forEach(
          payload.invitees,
          inviteeData => Effect.gen(function* () {
            const token = yield* pipe(
              DataSource.known({
                workspace_identifier: payload.workspace_identifier,
                invited_by_user_identifier: payload.invited_by_user_identifier,
                space_identifier: inviteeData.space_identifier,
                invitee_email_address: inviteeData.email_address,
              }),
              GenerateInvitationTokenDetailsPayload.fromSource(),
              Effect.flatMap(generateInvitationTokenDetails),
            )

            const inviteLink = `${process.env.APP_URL}/workspace/verify-invite/${token.token.value}?k=${token.token.key}`

            yield* Effect.suspend(() => pipe(
              WithQueueJob(
                SendWorkspaceInviteEmailJob,
                () => ({
                  email: inviteeData.email_address,
                  workspace_name: workspace.name,
                  inviter_name: invitedByUser.firstName,
                  invite_link: inviteLink,
                }),
              ),
              queueJob.dispatch,
            ))
          }),
        )

        return { success: true, message: 'Processed all invitees.' }
      }).pipe(telemetry.withTelemetrySpan('queue_invitation_email'))
    }

    function acceptInvitation(payload: ProcessedDataPayload<AcceptWorkspaceInvitationPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        const [workspaceId, inviteeEmail] = yield* stringMixer.decode(payload.token.value.value, payload.token.value.key)

        const cachedInvite = yield* Effect.tryPromise({
          try: () => cache
            .namespace(CacheNamespace.WORKSPACE_INVITE_TOKEN)
            .get({ key: `${workspaceId}_${inviteeEmail}` }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving cached invite token.'),
        })

        if (!cachedInvite) {
          return yield* new WorkspaceInviteException(
            'The invitation token is invalid or has expired.',
          )
        }

        const cacheData = yield* pipe(
          cachedInvite,
          Schema.decodeUnknown(
            Schema.Struct({
              workspace_id: Schema.ULID,
              sender_id: Schema.ULID,
              space_id: Schema.ULID,
              invitee_email: Schema.String,
              token: Schema.Struct({
                value: Schema.String,
                key: Schema.String,
              }),
            }),
          ),
          SchemaError.fromParseError('Unexpected error occurred while decoding cached invite token.'),
        )

        if (cacheData.token.value !== payload.token.value.value || cacheData.token.key !== payload.token.value.key) {
          return yield* new WorkspaceInviteException(
            'Token validation failed.',
          )
        }

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(WorkspaceIdentifier.make(cacheData.workspace_id)),
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

        if (!workspace) {
          return yield* new ResourceNotFoundException({ data: { resource: 'Workspace' } })
        }

        const space = yield* pipe(
          WithRetrievalStrategy(
            RetrieveSpaceUsingIdentifier,
            retrieve => retrieve(SpaceIdentifier.make(cacheData.space_id)),
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

        if (!space) {
          return yield* new ResourceNotFoundException({ data: { resource: 'Space' } })
        }

        const invitedBy = yield* pipe(
          WithRetrievalStrategy(
            RetrieveUserUsingIdentifier,
            retrieve => retrieve(UserIdentifier.make(cacheData.sender_id)),
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

        if (!invitedBy) {
          return yield* new ResourceNotFoundException({ data: { resource: 'User' } })
        }

        if (payload.mode === 'accept') {
          const getAuthenticatedUser = yield* authenticationService.getAuthenticatedUser

          if (inviteeEmail !== getAuthenticatedUser.email) {
            return yield* new WorkspaceInviteException('You logged in with a different email than the one you were invited with.')
          }

          yield* Effect.tryPromise({
            try: () => getAuthenticatedUser.related('workspaces').attach({
              [workspace.id]: {
                invited_by: invitedBy.id,
                joined_at: new Date(),
                status: WorkspaceMemberStatus.ACTIVE,
                is_active: false,
              },
            }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while adding user to workspace.'),
          })

          yield* Effect.tryPromise({
            try: () => invitedBy.related('spaces').attach({
              [space.id]: {},
            }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while adding user to space.'),
          })

          yield* Effect.tryPromise({
            try: () => cache
              .namespace(CacheNamespace.WORKSPACE_INVITE_TOKEN)
              .delete({ key: `${workspace.id}_${invitedBy.email}` }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while deleting invite token from cache.'),
          })

          return {
            mode: 'accept',
            message: 'You have successfully joined the workspace.',
            workspace: {
              id: workspace.uid,
              name: workspace.name,
            },
            user: {
              id: invitedBy.uid,
              email: invitedBy.email,
              firstName: invitedBy.firstName,
            },
          }
        } else if (payload.mode === 'login') {
          const password = Redacted.value(payload.password)
          const inviteeUser = yield* pipe(
            WithRetrievalStrategy(
              RetrieveUserUsingColumn,
              retrieve => retrieve('email', inviteeEmail),
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

          if (inviteeUser.email !== inviteeEmail) {
            return yield* new WorkspaceInviteException('Authentication failed.')
          }

          const isUserAuthenticated = yield* Effect.tryPromise({
            try: () => User.verifyCredentials(inviteeEmail, password),
            catch: errorConversion.toUnknownError('Authentication failed'),
          })

          if (!isUserAuthenticated) {
            return yield* new WorkspaceInviteException('Authentication failed.')
          }

          yield* Effect.tryPromise({
            try: () => inviteeUser.related('workspaces').attach({
              [workspace.id]: {
                invited_by: invitedBy.id,
                joined_at: new Date(),
                status: WorkspaceMemberStatus.ACTIVE,
                is_active: false,
              },
            }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while adding user to workspace.'),
          })

          yield* Effect.tryPromise({
            try: () => inviteeUser.related('spaces').attach({
              [space.id]: {},
            }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while adding user to space.'),
          })

          return {
            mode: 'login',
            message: 'You have successfully logged in and joined the workspace.',
            workspace: {
              id: workspace.uid,
              name: workspace.name,
            },
            userInstance: inviteeUser!,
          }
        } else if (payload.mode === 'register') {
          const firstName = payload.first_name
          const lastName = payload.last_name || ''
          const password = Redacted.value(payload.password)

          const userExists = yield* Effect.tryPromise({
            try: () => User.findBy('email', cacheData.invitee_email),
            catch: errorConversion.toUnknownError('Failed to check if user exists'),
          })

          if (userExists) {
            return yield* new WorkspaceInviteException('User already exists with this email. Please login instead.')
          }

          const user = yield* Effect.tryPromise({
            try: () => User.create({
              email: cacheData.invitee_email,
              firstName,
              lastName,
              password,
              isAccountVerified: true,
              defaultWorkspaceId: workspace.id,
              onboardingStatus: OnboardingStatus.COMPLETED,
            }),
            catch: errorConversion.toUnknownError('Failed to create user'),
          })

          yield* Effect.tryPromise({
            try: () => user.related('workspaces').attach({
              [workspace.id]: {
                invited_by: invitedBy.id,
                joined_at: new Date(),
                status: WorkspaceMemberStatus.ACTIVE,
                is_active: false,
              },
            }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while adding user to workspace.'),
          })

          yield* Effect.tryPromise({
            try: () => user.related('spaces').attach({
              [space.id]: {},
            }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while adding user to space.'),
          })

          yield* Effect.tryPromise({
            try: () => cache
              .namespace(CacheNamespace.WORKSPACE_INVITE_TOKEN)
              .delete({ key: `${workspace.id}_${user.email}` }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while deleting invite token from cache.'),
          })

          return {
            mode: 'register',
            message: 'You have successfully registered and joined the workspace.',
            workspace: {
              id: workspace.uid,
              name: workspace.name,
            },
            user: {
              id: user.uid,
              email: user.email,
              firstName: user.firstName,
            },
          }
        }

        return yield* new WorkspaceInviteException('Invalid mode.')
      }).pipe(telemetry.withTelemetrySpan('accept_invitation'))
    }

    return {
      generateInvitationTokenDetails,
      retrieveInvitationDetails,
      queueInvitationEmail,
      acceptInvitation,
    }
  }),
}) {}
