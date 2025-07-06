import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type SendWorkspaceInviteEmailPayload from '#modules/workspace/payloads/send_workspace_invite_email_payload'
import { CacheNameSpace } from '#constants/cache_namespace'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import HttpContext from '#core/http/contexts/http_context'
import SchemaError from '#core/schema/errors/schema_error'
import User from '#models/user_model'
import Workspace from '#models/workspace_model'
import AuthenticationService from '#modules/iam/services/authentication_service'
import { WorkspaceMemberStatus } from '#modules/workspace/constants/workspace_member_status'
import SendWorkspaceInviteJob from '#modules/workspace/jobs/send_workspace_invite_job'
import StringMixerService from '#shared/common/services/string_mixer_service'
import cache from '@adonisjs/cache/services/main'
import queue from '@rlanz/bull-queue/services/main'
import { Effect, pipe, Schema } from 'effect'

export default class WorkspaceService extends Effect.Service<WorkspaceService>()('@service/modules/workspace', {
  dependencies: [AuthenticationService.Default],
  effect: Effect.gen(function* () {
    const authenticationService = yield* AuthenticationService
    const errorConversion = yield* ErrorConversionService

    function sendWorkspaceInviteEmail(payload: ProcessedDataPayload<SendWorkspaceInviteEmailPayload>) {
      return Effect.gen(function* () {
        const { context } = yield* HttpContext
        const ctx = yield* context

        const currentActiveWorkspaceId = ctx.activeWorkspaceId
        const invitedByUser = yield* authenticationService.getAuthenticatedUser
        const stringMixer = yield* StringMixerService

        const workspace = yield* Effect.tryPromise({
          try: () => Workspace.query()
            .where('uid', currentActiveWorkspaceId)
            .firstOrFail(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while fetching workspace by ID.'),
        })

        yield* Effect.forEach(
          payload.invitees,
          inviteeEmail => Effect.gen(function* () {
            let user = yield* Effect.tryPromise({
              try: () => User.query().where('email', inviteeEmail).first(),
              catch: errorConversion.toUnknownError('Unexpected error occurred while fetching user by email.'),
            })

            if (!user) {
              user = yield* Effect.tryPromise({
                try: () => User.create({ email: inviteeEmail, isVerified: false }),
                catch: errorConversion.toUnknownError('Unexpected error occurred while creating user.'),
              })
            }

            const tokenObj = yield* stringMixer.encode(user.uid, inviteeEmail)

            const cachePayload = yield* pipe(
              {
                user_id: user.id,
                workspace_id: workspace.id,
                inviter_id: invitedByUser.id,
                invitee_email: inviteeEmail,
                token: {
                  value: tokenObj.value,
                  key: tokenObj.key,
                },
              },
              Schema.decode(
                Schema.Struct({
                  user_id: Schema.Number,
                  workspace_id: Schema.Number,
                  inviter_id: Schema.Number,
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

            console.log('Caching invite token for user:', user.uid, 'with email:', inviteeEmail)

            console.warn('Storing invite token:', {
              namespace: CacheNameSpace.WORKSPACE_INVITE_TOKEN,
              key: user.uid,
              value: cachePayload,
            })

            yield* Effect.tryPromise({
              try: () => cache
                .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
                .set({
                  key: user.uid,
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

    function verifyInvite(payload: { token: string; k: string }) {
      return Effect.gen(function* () {
        const token = payload.token
        const key = payload.k
        const stringMixer = yield* StringMixerService

        const decodedDetails = yield* stringMixer.decode(token, key)
        if (!Array.isArray(decodedDetails) || decodedDetails.length < 2) {
          throw new Error('Invalid token format')
        }

        const [userId] = decodedDetails

        console.log('Verifying invite for user:', userId, 'with token:', token, 'and key:', key)

        const cachedInvite = yield* Effect.tryPromise({
          try: () => cache
            .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
            .get({ key: userId }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving cached invite token.'),
        })

        if (!cachedInvite) {
          throw new Error('Invite token not found or expired')
        }

        const cachedData = yield* pipe(
          cachedInvite,
          Schema.decodeUnknown(
            Schema.Struct({
              user_id: Schema.Number,
              workspace_id: Schema.Number,
              inviter_id: Schema.Number,
              invitee_email: Schema.String,
              token: Schema.Struct({
                value: Schema.String,
                key: Schema.String,
              }),
            }),
          ),
          SchemaError.fromParseError('Unexpected error occurred while decoding cached invite token.'),
        )

        yield* Effect.tryPromise({
          try: () => cache
            .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
            .delete({ key: userId }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while deleting invite token from cache.'),
        })

        if (cachedData.token.value !== token || cachedData.token.key !== key) {
          throw new Error('Token validation failed')
        }

        const user = yield* Effect.tryPromise({
          try: () => User.findBy('uid', userId),
          catch: errorConversion.toUnknownError('Failed to fetch user'),
        })

        if (!user) {
          throw new Error('User not found')
        }

        const workspace = yield* Effect.tryPromise({
          try: () => Workspace.findBy('id', cachedData.workspace_id),
          catch: errorConversion.toUnknownError('Failed to fetch workspace'),
        })

        if (!workspace) {
          throw new Error('Workspace not found')
        }

        console.log('Adding user to workspace:', user.id, 'in workspace:', workspace.id, 'with inviter:', cachedData.inviter_id)

        yield* Effect.tryPromise({
          try: () => user.related('workspaces').attach({
            [workspace.id]: {
              invited_by: cachedData.inviter_id,
              joined_at: null,
              status: WorkspaceMemberStatus.ACTIVE,
              is_active: false,
            },
          }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while adding user to workspace.'),
        })

        const hasPassword = user.password && user.password.length > 0
        const hasFirstName = user.firstName && user.firstName.length > 0

        yield* Effect.tryPromise({
          try: () => cache
            .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
            .delete({ key: userId }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while deleting invite token from cache.'),
        })

        if (hasPassword && hasFirstName) {
          return {
            action: 'signin',
            message: 'User is already registered. Please sign in to join the workspace.',
            data: {
              email: user.email,
              workspace_name: workspace.name,
              workspace_id: workspace.uid,
              redirect_url: `${process.env.APP_URL}/auth/login`,
            },
          }
        } else {
          return {
            action: 'signup',
            message: 'Please complete your registration to join the workspace.',
            data: {
              email: user.email,
              workspace_name: workspace.name,
              workspace_id: workspace.uid,
              inviter_id: cachedData.inviter_id,
              needs_password: !hasPassword,
              needs_first_name: !hasFirstName,
              redirect_url: `${process.env.APP_URL}/auth/invited-user/?email=${encodeURIComponent(user.email || '')}`,
            },
          }
        }
      })
    }

    return {
      sendWorkspaceInviteEmail,
      verifyInvite,
    }
  }),
}) {}
