import type AcceptInvitePayload from '#modules/workspace/payloads/accept_invite_payload'
import { CacheNameSpace } from '#constants/cache_namespace'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import SchemaError from '#core/schema/errors/schema_error'
import User from '#models/user_model'
import Workspace from '#models/workspace_model'
import { WorkspaceMemberStatus } from '#modules/workspace/constants/workspace_member_status'
import StringMixerService from '#shared/common/services/string_mixer_service'
import cache from '@adonisjs/cache/services/main'
import { Effect, pipe, Schema } from 'effect'

export default class InviteUserService {
  // // Generate and cache invite token for existing user
  // private effectGenerateInviteToken(payload: InviteExistingUserPayload) {
  //   return Effect.gen(function* () {
  //     const stringMixer = yield* StringMixerService
  //     const errorConversion = yield* ErrorConversionService

  //     const token = yield* stringMixer.encode(payload.user_id, payload.workspace_id, payload.email)

  //     const details = yield* pipe(
  //       {
  //         user_id: payload.user_id,
  //         workspace_id: payload.workspace_id,
  //         inviter_id: payload.inviter_id,
  //         email: payload.email,
  //         token: {
  //           value: token.value,
  //           key: token.key,
  //         },
  //       },
  //       Schema.decode(
  //         Schema.Struct({
  //           user_id: Schema.ULID,
  //           workspace_id: Schema.ULID,
  //           inviter_id: Schema.ULID,
  //           email: Schema.String,
  //           token: Schema.Struct({
  //             value: Schema.String,
  //             key: Schema.String,
  //           }),
  //         }),
  //         { errors: 'all' },
  //       ),
  //       SchemaError.fromParseError('Unexpected error occurred while decoding the invite token details for caching.'),
  //     )

  //     yield* Effect.tryPromise({
  //       try: () => cache
  //         .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
  //         .set({
  //           key: `${payload.user_id}_${payload.workspace_id}`,
  //           value: details,
  //           ttl: Duration.toMillis(payload.duration),
  //         }),
  //       catch: errorConversion.toUnknownError('Unexpected error occurred while caching the invite token details.'),
  //     })

  //     return details
  //   })
  // }

  // // Generate and cache invite token for new user
  // private effectGenerateNewUserInviteToken(payload: InviteNewUserPayload) {
  //   return Effect.gen(function* () {
  //     const stringMixer = yield* StringMixerService
  //     const errorConversion = yield* ErrorConversionService

  //     const tempUserId = ulid()
  //     const token = yield* stringMixer.encode(tempUserId, payload.workspace_id, payload.email)

  //     const details = yield* pipe(
  //       {
  //         temp_user_id: tempUserId,
  //         workspace_id: payload.workspace_id,
  //         inviter_id: payload.inviter_id,
  //         email: payload.email,
  //         first_name: payload.first_name,
  //         token: {
  //           value: token.value,
  //           key: token.key,
  //         },
  //       },
  //       Schema.decode(
  //         Schema.Struct({
  //           temp_user_id: Schema.ULID,
  //           workspace_id: Schema.ULID,
  //           inviter_id: Schema.ULID,
  //           email: Schema.String,
  //           first_name: Schema.String,
  //           token: Schema.Struct({
  //             value: Schema.String,
  //             key: Schema.String,
  //           }),
  //         }),
  //         { errors: 'all' },
  //       ),
  //       SchemaError.fromParseError('Unexpected error occurred while decoding the new user invite token details for caching.'),
  //     )

  //     yield* Effect.tryPromise({
  //       try: () => cache
  //         .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
  //         .set({
  //           key: `${tempUserId}_${payload.workspace_id}`,
  //           value: details,
  //           ttl: Duration.toMillis(payload.duration),
  //         }),
  //       catch: errorConversion.toUnknownError('Unexpected error occurred while caching the new user invite token details.'),
  //     })

  //     return details
  //   })
  // }

  // // Send invite to existing user
  // async inviteExistingUser(payload: InviteExistingUserPayload) {
  //   const program = Effect.gen(this, function* () {
  //     const errorConversion = yield* ErrorConversionService

  //     // Get user and workspace details
  //     const user = yield* Effect.tryPromise({
  //       try: () => User.findOrFail(payload.user_id),
  //       catch: errorConversion.toUnknownError('User not found.'),
  //     })

  //     const workspace = yield* Effect.tryPromise({
  //       try: () => Workspace.findOrFail(payload.workspace_id),
  //       catch: errorConversion.toUnknownError('Workspace not found.'),
  //     })

  //     const inviter = yield* Effect.tryPromise({
  //       try: () => User.findOrFail(payload.inviter_id),
  //       catch: errorConversion.toUnknownError('Inviter not found.'),
  //     })

  //     // Add user to workspace_members table
  //     yield* Effect.tryPromise({
  //       try: () => user.related('workspaces').attach({
  //         [workspace.id]: {
  //           invited_by: inviter.id,
  //           joined_at: null,
  //           status: WorkspaceMemberStatus.INVITED,
  //           is_active: false,
  //         },
  //       }),
  //       catch: errorConversion.toUnknownError('Failed to add user to workspace.'),
  //     })

  //     // Generate invite token
  //     const details = yield* this.effectGenerateInviteToken(payload)

  //     // Send email
  //     const acceptInviteLink = `${process.env.APP_URL}/workspace/accept-invite/${details.token.value}?k=${details.token.key}`

  //     yield* Effect.tryPromise({
  //       try: () => queue.dispatch(SendWorkspaceInviteJob, {
  //         email: details.email,
  //         workspaceName: workspace.name,
  //         inviterName: `${inviter.firstName} ${inviter.lastName || ''}`.trim(),
  //         inviteLink: acceptInviteLink,
  //         type: 'existing_user' as const,
  //       }),
  //       catch: errorConversion.toUnknownError('Unexpected error occurred while dispatching the workspace invite email job.'),
  //     })

  //     return { success: true, inviteLink: acceptInviteLink }
  //   })

  //   return await Effect.runPromise(
  //     program.pipe(
  //       Effect.provide(StringMixerService.Default),
  //       Effect.provide(ErrorConversionService.Default),
  //     ),
  //   )
  // }

  // // Send invite to new user
  // async inviteNewUser(payload: InviteNewUserPayload) {
  //   const program = Effect.gen(this, function* () {
  //     const errorConversion = yield* ErrorConversionService

  //     // Get workspace and inviter details
  //     const workspace = yield* Effect.tryPromise({
  //       try: () => Workspace.findOrFail(payload.workspace_id),
  //       catch: errorConversion.toUnknownError('Workspace not found.'),
  //     })

  //     const inviter = yield* Effect.tryPromise({
  //       try: () => User.findOrFail(payload.inviter_id),
  //       catch: errorConversion.toUnknownError('Inviter not found.'),
  //     })

  //     // Create a temporary user record
  //     const tempUser = yield* Effect.tryPromise({
  //       try: () => User.create({
  //         firstName: payload.first_name,
  //         email: payload.email,
  //         isVerified: false,
  //         onboardingStatus: OnboardingStatus.NOT_STARTED,
  //       }),
  //       catch: errorConversion.toUnknownError('Failed to create temporary user.'),
  //     })

  //     // Add user to workspace_members table
  //     yield* Effect.tryPromise({
  //       try: () => tempUser.related('workspaces').attach({
  //         [workspace.id]: {
  //           invited_by: inviter.id,
  //           joined_at: null,
  //           status: WorkspaceMemberStatus.PENDING_ACTIVATION,
  //           is_active: false,
  //         },
  //       }),
  //       catch: errorConversion.toUnknownError('Failed to add user to workspace.'),
  //     })

  //     // Generate invite token
  //     const details = yield* this.effectGenerateNewUserInviteToken({
  //       ...payload,
  //       duration: payload.duration,
  //     })

  //     // Send email
  //     const signupLink = `${process.env.APP_URL}/workspace/signup-invite/${details.token.value}?k=${details.token.key}`

  //     yield* Effect.tryPromise({
  //       try: () => queue.dispatch(SendWorkspaceInviteJob, {
  //         email: details.email,
  //         workspaceName: workspace.name,
  //         inviterName: `${inviter.firstName} ${inviter.lastName || ''}`.trim(),
  //         inviteLink: signupLink,
  //         type: 'new_user' as const,
  //       }),
  //       catch: errorConversion.toUnknownError('Unexpected error occurred while dispatching the workspace invite email job.'),
  //     })

  //     return { success: true, inviteLink: signupLink, tempUserId: tempUser.uid }
  //   })

  //   return await Effect.runPromise(
  //     program.pipe(
  //       Effect.provide(StringMixerService.Default),
  //       Effect.provide(ErrorConversionService.Default),
  //     ),
  //   )
  // }

  // Accept invite (for existing users)
  async acceptInvite(payload: AcceptInvitePayload) {
    const program = Effect.gen(function* () {
      const stringMixer = yield* StringMixerService
      const errorConversion = yield* ErrorConversionService

      // Decode token
      const decodedDetails = yield* stringMixer.decode(payload.token, payload.key)
      if (!Array.isArray(decodedDetails) || decodedDetails.length !== 3) {
        throw new Error('Invalid token format: Decoded details must contain userId, workspaceId, and email.')
      }
      const [
        userId,
        workspaceId,
        email,
      ] = decodedDetails

      // Get cached details
      const cachedDetails = yield* pipe(
        Effect.tryPromise({
          try: () => cache
            .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
            .get({ key: `${userId}_${workspaceId}` }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving cached invite token details.'),
        }),
        Effect.flatMap(
          data => pipe(
            data,
            Schema.decodeUnknown(
              Schema.Struct({
                user_id: Schema.ULID,
                workspace_id: Schema.ULID,
                inviter_id: Schema.ULID,
                email: Schema.String,
                token: Schema.Struct({
                  value: Schema.String,
                  key: Schema.String,
                }),
              }),
              { errors: 'all' },
            ),
            SchemaError.fromParseError('Unexpected error occurred while decoding the cached invite token details.'),
          ),
        ),
      )

      // Validate token
      if (!cachedDetails
        || cachedDetails.user_id !== userId
        || cachedDetails.workspace_id !== workspaceId
        || cachedDetails.email !== email
        || cachedDetails.token.value !== payload.token
        || cachedDetails.token.key !== payload.key) {
        throw new Error('Token validation failed: Invalid or expired token.')
      }

      // Update workspace membership
      const user = yield* Effect.tryPromise({
        try: () => User.findOrFail(userId),
        catch: errorConversion.toUnknownError('User not found.'),
      })

      yield* Effect.tryPromise({
        try: () => user.related('workspaces').sync({
          [workspaceId]: {
            invited_by: cachedDetails.inviter_id,
            joined_at: new Date(),
            status: WorkspaceMemberStatus.ACTIVE,
            is_active: true,
          },
        }),
        catch: errorConversion.toUnknownError('Failed to update workspace membership.'),
      })

      // Delete token from cache
      yield* Effect.tryPromise({
        try: () => cache
          .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
          .delete({ key: `${userId}_${workspaceId}` }),
        catch: errorConversion.toUnknownError('Unexpected error occurred while deleting the invite token from cache.'),
      })

      return {
        user_id: cachedDetails.user_id,
        workspace_id: cachedDetails.workspace_id,
        email: cachedDetails.email,
      }
    })

    return await Effect.runPromise(
      program.pipe(
        Effect.provide(StringMixerService.Default),
        Effect.provide(ErrorConversionService.Default),
      ),
    )
  }

  // Verify new user invite token (for signup page)
  async verifyNewUserInviteToken(payload: AcceptInvitePayload) {
    const program = Effect.gen(function* () {
      const stringMixer = yield* StringMixerService
      const errorConversion = yield* ErrorConversionService

      // Decode token
      const decodedDetails = yield* stringMixer.decode(payload.token, payload.key)
      if (!Array.isArray(decodedDetails) || decodedDetails.length !== 3) {
        throw new Error('Invalid token format: Decoded details must contain tempUserId, workspaceId, and email.')
      }
      const [
        tempUserId,
        workspaceId,
        email,
      ] = decodedDetails

      // Get cached details
      const cachedDetails = yield* pipe(
        Effect.tryPromise({
          try: () => cache
            .namespace(CacheNameSpace.WORKSPACE_INVITE_TOKEN)
            .get({ key: `${tempUserId}_${workspaceId}` }),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving cached invite token details.'),
        }),
        Effect.flatMap(
          data => pipe(
            data,
            Schema.decodeUnknown(
              Schema.Struct({
                temp_user_id: Schema.ULID,
                workspace_id: Schema.ULID,
                inviter_id: Schema.ULID,
                email: Schema.String,
                first_name: Schema.String,
                token: Schema.Struct({
                  value: Schema.String,
                  key: Schema.String,
                }),
              }),
              { errors: 'all' },
            ),
            SchemaError.fromParseError('Unexpected error occurred while decoding the cached invite token details.'),
          ),
        ),
      )

      // Validate token
      if (!cachedDetails
        || cachedDetails.temp_user_id !== tempUserId
        || cachedDetails.workspace_id !== workspaceId
        || cachedDetails.email !== email
        || cachedDetails.token.value !== payload.token
        || cachedDetails.token.key !== payload.key) {
        throw new Error('Token validation failed: Invalid or expired token.')
      }

      return {
        temp_user_id: cachedDetails.temp_user_id,
        workspace_id: cachedDetails.workspace_id,
        inviter_id: cachedDetails.inviter_id,
        email: cachedDetails.email,
        first_name: cachedDetails.first_name,
      }
    })

    return await Effect.runPromise(
      program.pipe(
        Effect.provide(StringMixerService.Default),
        Effect.provide(ErrorConversionService.Default),
      ),
    )
  }

  // Complete new user signup and activate workspace membership
  async completeNewUserSignup(userUid: string, tempUserUid: string, workspaceUid: string) {
    const program = Effect.gen(function* () {
      const errorConversion = yield* ErrorConversionService

      // Find the new user
      const newUser = yield* Effect.tryPromise({
        try: () => User.findByOrFail('uid', userUid),
        catch: errorConversion.toUnknownError('New user not found.'),
      })

      // Find the temp user
      const tempUser = yield* Effect.tryPromise({
        try: () => User.findByOrFail('uid', tempUserUid),
        catch: errorConversion.toUnknownError('Temporary user not found.'),
      })

      // Find the workspace
      const workspace = yield* Effect.tryPromise({
        try: () => Workspace.findByOrFail('uid', workspaceUid),
        catch: errorConversion.toUnknownError('Workspace not found.'),
      })

      // Get the membership details from temp user
      const tempMembership = yield* Effect.tryPromise({
        try: async () => {
          const membership = await tempUser.related('workspaces').query().where('workspace_id', workspace.id).pivotColumns(['invited_by', 'status']).first()
          return membership
        },
        catch: errorConversion.toUnknownError('Temp user membership not found.'),
      })

      if (!tempMembership) {
        throw new Error('Temporary user membership not found.')
      }

      // Transfer membership from temp user to new user
      yield* Effect.tryPromise({
        try: () => newUser.related('workspaces').attach({
          [workspace.id]: {
            invited_by: (tempMembership as any).$pivot.invited_by,
            joined_at: new Date(),
            status: WorkspaceMemberStatus.ACTIVE,
            is_active: true,
          },
        }),
        catch: errorConversion.toUnknownError('Failed to transfer workspace membership.'),
      })

      // Remove temp user's membership
      yield* Effect.tryPromise({
        try: () => tempUser.related('workspaces').detach([workspace.id]),
        catch: errorConversion.toUnknownError('Failed to remove temp user membership.'),
      })

      // Delete temp user
      yield* Effect.tryPromise({
        try: () => tempUser.delete(),
        catch: errorConversion.toUnknownError('Failed to delete temp user.'),
      })

      return {
        success: true,
        user_id: newUser.uid,
        workspace_id: workspace.uid,
      }
    })

    return await Effect.runPromise(
      program.pipe(
        Effect.provide(ErrorConversionService.Default),
      ),
    )
  }
}
