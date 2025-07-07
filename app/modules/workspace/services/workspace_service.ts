import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type AcceptWorkspaceInvitePayload from '#modules/workspace/payloads/accept_workspace_invite_payload'
import type InviteDetailsPayload from '#modules/workspace/payloads/invite_details_payload'
import type SendWorkspaceInviteEmailPayload from '#modules/workspace/payloads/send_workspace_invite_email_payload'
import { CacheNameSpace } from '#constants/cache_namespace'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import HttpContext from '#core/http/contexts/http_context'
import SchemaError from '#core/schema/errors/schema_error'
import User from '#models/user_model'
import Workspace from '#models/workspace_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import AuthenticationService from '#modules/iam/services/authentication_service'
import { WorkspaceMemberStatus } from '#modules/workspace/constants/workspace_member_status'
import SendWorkspaceInviteJob from '#modules/workspace/jobs/send_workspace_invite_job'
import StringMixerService from '#shared/common/services/string_mixer_service'
import cache from '@adonisjs/cache/services/main'
import queue from '@rlanz/bull-queue/services/main'
import { Effect, pipe, Redacted, Schema } from 'effect'

export default class WorkspaceService extends Effect.Service<WorkspaceService>()('@service/modules/workspace', {
  dependencies: [
    AuthenticationService.Default,
    ErrorConversionService.Default,
    StringMixerService.Default,
  ],
  effect: Effect.gen(function* () {
    const authenticationService = yield* AuthenticationService
    const errorConversion = yield* ErrorConversionService
    const stringMixer = yield* StringMixerService

    function sendWorkspaceInviteEmail(payload: ProcessedDataPayload<SendWorkspaceInviteEmailPayload>) {
      return Effect.gen(function* () {
        const { context } = yield* HttpContext
        const ctx = yield* context

        const currentActiveWorkspaceId = ctx.activeWorkspaceId
        const invitedByUser = yield* authenticationService.getAuthenticatedUser

        const workspace = yield* Effect.tryPromise({
          try: () => Workspace.query()
            .where('uid', currentActiveWorkspaceId)
            .firstOrFail(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while fetching workspace by ID.'),
        })

        yield* Effect.forEach(
          payload.invitees,
          inviteeEmail => Effect.gen(function* () {
            const tokenObj = yield* stringMixer.encode(workspace.uid, inviteeEmail)

            const cachePayload = yield* pipe(
              {
                workspace_id: workspace.uid,
                sender_id: invitedByUser.uid,
                invitee_email: inviteeEmail,
                token: {
                  value: tokenObj.value,
                  key: tokenObj.key,
                },
              },
              Schema.decode(
                Schema.Struct({
                  workspace_id: Schema.ULID,
                  sender_id: Schema.ULID,
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

            console.warn('Storing invite token:', {
              namespace: CacheNameSpace.WORKSPACE_INVITE_TOKEN,
              key: `${workspace.uid}_${inviteeEmail}`,
              value: cachePayload,
            })

            yield* Effect.tryPromise({
              try: () => cache
                .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
                .set({
                  key: `${workspace.uid}_${inviteeEmail}`,
                  value: cachePayload,
                  ttl: '1d',
                }),
              catch: errorConversion.toUnknownError('Unexpected error occurred while caching invite token.'),
            })

            const inviteLink = `${process.env.APP_URL}/workspace/verify-invite/${tokenObj.value}?k=${tokenObj.key}`

            yield* Effect.tryPromise({
              try: () => queue.dispatch(SendWorkspaceInviteJob, {
                email: inviteeEmail,
                workspaceName: workspace.name,
                inviterName: invitedByUser.firstName,
                inviteLink,
              }),
              catch: errorConversion.toUnknownError('Unexpected error occurred while sending invite email.'),
            })
          }),
        )

        return { success: true, message: 'Processed all invitees.' }
      })
    }

    function acceptInvite(payload: ProcessedDataPayload<AcceptWorkspaceInvitePayload>) {
      return Effect.gen(function* () {
        const token = payload.token.value
        const key = payload.token.key

        const [workspaceId, inviteeEmail] = yield* stringMixer.decode(token, key)

        const cachedInvite = yield* Effect.tryPromise({
          try: () => cache
            .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
            .get({ key: `${workspaceId}_${inviteeEmail}` }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving cached invite token.'),
        })

        if (!cachedInvite) {
          throw new Error('Invite token not found or expired')
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

        if (cacheData.token.value !== token || cacheData.token.key !== key) {
          throw new Error('Token validation failed')
        }

        const workspace = yield* Effect.tryPromise({
          try: () => Workspace.findBy('uid', cacheData.workspace_id),
          catch: errorConversion.toUnknownError('Failed to fetch workspace'),
        })

        if (!workspace) {
          throw new Error('Workspace not found')
        }

        const sender = yield* Effect.tryPromise({
          try: () => User.findBy('uid', cacheData.sender_id),
          catch: errorConversion.toUnknownError('Unexpected error occurred while fetching sender user.'),
        })

        if (!sender) {
          throw new Error('The person who invited you is not found')
        }

        if (payload.mode === 'accept') {
          const getAuthenticatedUser = yield* authenticationService.getAuthenticatedUser

          if (inviteeEmail !== getAuthenticatedUser.email) {
            throw new Error('You logged in with a different email than the one you were invited with.')
          }

          const user = yield* Effect.tryPromise({
            try: () => User.findBy('email', inviteeEmail),
            catch: errorConversion.toUnknownError('Failed to fetch user by email'),
          })

          if (!user) {
            throw new Error('User not found')
          }

          yield* Effect.tryPromise({
            try: () => user.related('workspaces').attach({
              [workspace.id]: {
                invited_by: sender.id,
                joined_at: new Date(),
                status: WorkspaceMemberStatus.ACTIVE,
                is_active: false,
              },
            }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while adding user to workspace.'),
          })

          yield* Effect.tryPromise({
            try: () => cache
              .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
              .delete({ key: `${workspace.id}_${user.email}` }),
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
              id: user.uid,
              email: user.email,
              firstName: user.firstName,
            },
          }
        } else if (payload.mode === 'login') {
          const password = Redacted.value(payload.password)

          const user = yield* Effect.tryPromise({
            try: () => User.findBy('email', inviteeEmail),
            catch: errorConversion.toUnknownError('Failed to fetch user by email'),
          })

          if (!user) {
            throw new Error('User not found')
          }

          if (user.email !== inviteeEmail) {
            throw new Error('Authentication failed')
          }

          const isUserAuthenticated = yield* Effect.tryPromise({
            try: () => User.verifyCredentials(inviteeEmail, password),
            catch: errorConversion.toUnknownError('Authentication failed'),
          })

          if (!isUserAuthenticated) {
            throw new Error('Authentication failed')
          }

          yield* Effect.tryPromise({
            try: () => user.related('workspaces').attach({
              [workspace.id]: {
                invited_by: sender.id,
                joined_at: new Date(),
                status: WorkspaceMemberStatus.ACTIVE,
                is_active: false,
              },
            }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while adding user to workspace.'),
          })

          // yield* Effect.tryPromise({
          //   try: () => cache
          //     .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
          //     .delete({ key: `${workspace.id}_${user.email}` }),
          //   catch: errorConversion.toUnknownError('Unexpected error occurred while deleting invite token from cache.'),
          // })

          return {
            mode: 'login',
            message: 'You have successfully logged in and joined the workspace.',
            workspace: {
              id: workspace.uid,
              name: workspace.name,
            },
            userInstance: user!,
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
            throw new Error('User already exists with this email. Please login instead.')
          }

          const user = yield* Effect.tryPromise({
            try: () => User.create({
              email: cacheData.invitee_email,
              firstName,
              lastName,
              password,
              isVerified: true,
              defaultWorkspaceId: workspace.id,
              onboardingStatus: OnboardingStatus.COMPLETED,
            }),
            catch: errorConversion.toUnknownError('Failed to create user'),
          })

          yield* Effect.tryPromise({
            try: () => user.related('workspaces').attach({
              [workspace.id]: {
                invited_by: sender.id,
                joined_at: new Date(),
                status: WorkspaceMemberStatus.ACTIVE,
                is_active: false,
              },
            }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while adding user to workspace.'),
          })

          yield* Effect.tryPromise({
            try: () => cache
              .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
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

        throw new Error('Invalid mode')
      })
    }

    function getInviteDetails(payload: ProcessedDataPayload<InviteDetailsPayload>) {
      return Effect.gen(function* () {
        const token = payload.token.value
        const key = payload.token.key

        const decodedDetails = yield* stringMixer.decode(token, key)

        const cachedInvite = yield* Effect.tryPromise({
          try: () => cache
            .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
            .get({ key: decodedDetails[0] }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving cached invite token.'),
        })

        if (!cachedInvite) {
          throw new Error('Cached invite token not found.')
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

        if (!cacheData) {
          throw new Error('Cached invite token not found.')
        }

        const workspace = yield* Effect.tryPromise({
          try: () => Workspace.findBy('uid', cacheData.workspace_id),
          catch: errorConversion.toUnknownError('Failed to fetch workspace by ID.'),
        })

        if (!workspace) {
          throw new Error('Workspace not found.')
        }

        const sender = yield* Effect.tryPromise({
          try: () => User.findBy('uid', cacheData.sender_id),
          catch: errorConversion.toUnknownError('Failed to fetch sender user.'),
        })

        if (!sender) {
          throw new Error('Sender user not found.')
        }

        const invitee = yield* Effect.tryPromise({
          try: () => User.findBy('email', cacheData.invitee_email),
          catch: errorConversion.toUnknownError('Failed to fetch user by email.'),
        })

        console.log('Invite details:', {
          workspaceId: cacheData.workspace_id,
          senderId: cacheData.sender_id,
          inviteeEmail: cacheData.invitee_email,
          tokenValue: cacheData.token.value,
          tokenKey: cacheData.token.key,
        })

        const responseData = {
          workspace: {
            id: workspace.uid,
            name: workspace.name,
            logo: workspace.logoUrl ? workspace.logoUrl : null,
          },
          sender: {
            id: sender.uid,
            email: sender.email,
            firstName: sender.firstName,
            lastName: sender.lastName ? sender.lastName : '',
          },
          invitee: invitee
            ? {
                status: true,
                id: invitee.uid,
                email: invitee.email,
                firstName: invitee.firstName,
                lastName: invitee.lastName ? invitee.lastName : '',
              }
            : {
                status: false,
              },

        }

        return responseData
      })
    }

    return {
      sendWorkspaceInviteEmail,
      acceptInvite,
      getInviteDetails,
    }
  }),
}) {}
