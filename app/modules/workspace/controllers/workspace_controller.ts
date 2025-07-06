import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import HttpContext from '#core/http/contexts/http_context'
import HttpRequestService from '#core/http/services/http_request_service'
import VineValidationService from '#core/validation/services/vine_validation_service'
import Workspace from '#models/workspace_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import SendWorkspaceInviteEmailPayload from '#modules/workspace/payloads/send_workspace_invite_email_payload'
import InviteUserService from '#modules/workspace/services/invite_user_service'
import WorkspaceService from '#modules/workspace/services/workspace_service'
import StringMixerService from '#shared/common/services/string_mixer_service'
import vine from '@vinejs/vine'
import { Effect, pipe } from 'effect'

export default class WorkspaceController {
  protected inviteUserService = new InviteUserService()

  async createWorkspace({ auth, request, response }: FrameworkHttpContext) {
    // Since auth middleware is applied, user will always be present
    const user = await auth.use('web').user!

    const workspaceData = request.body()

    // Create the workspace
    const workspace = await Workspace.create(workspaceData)

    // Attach the user as a member (assuming many-to-many relation)
    await workspace.related('members').attach([user.id])

    // Check and update onboarding status
    if (user.onboardingStatus === OnboardingStatus.PENDING) {
      user.onboardingStatus = OnboardingStatus.COMPLETED
      await user.save()
    }

    return response.created({ workspace, onboardingStatus: user.onboardingStatus })
  }

  async setActiveWorkspace({ response, session, request }: FrameworkHttpContext) {
    const payload = await request.validateUsing(
      vine.compile(
        vine.object({
          id: vine.string().ulid(),
        }),
      ),
    )

    const workspace = await Workspace.query()
      .where('uid', payload.id)
      .first()

    if (!workspace) {
      return response.forbidden({ message: 'You do not have access to this workspace.' })
    }

    session.put('active_workspace', workspace.uid)

    response.ok({ message: 'Active workspace set successfully', workspace: { id: workspace.uid } })
  }

  async sendWorkspaceInviteEmail(ctx: FrameworkHttpContext) {
    const program = Effect.gen(function* () {
      const workspaceService = yield* WorkspaceService

      const payload = yield* SendWorkspaceInviteEmailPayload.fromRequest()

      const result = yield* workspaceService.sendWorkspaceInviteEmail(payload)

      return ctx.response.status(200).json(result)
    })

    return Effect.runPromise(
      pipe(
        program,
        Effect.provide(WorkspaceService.Default),
        Effect.provide(HttpContext.provide(ctx)),
        Effect.provide(ErrorConversionService.Default),
        Effect.provide(StringMixerService.Default),
        Effect.provide(VineValidationService.Default),
        Effect.provide(TypedEffectService.Default),
        Effect.provide(HttpRequestService.Default),
        Effect.catchAll(error =>
          Effect.sync(() =>
            ctx.response.internalServerError({
              success: false,
              message: error?.message ?? 'Unexpected error occurred',
            }),
          ),
        ),
      ),
    )
  }

  async verifyInvite(ctx: FrameworkHttpContext) {
    const program = Effect.gen(function* () {
      const workspaceService = yield* WorkspaceService

      // Extract token from URL params and key from query params
      const token = ctx.params.token
      const key = ctx.request.qs().k

      // const payload = yield* VerifyInviteUserPayload.fromRequest(ctx.request as any)

      // console.warn('Invite verification payload:', payload)

      const result = yield* workspaceService.verifyInvite({ token, k: key })

      return ctx.response.status(200).json(result)
    })

    return Effect.runPromise(
      pipe(
        program,
        Effect.provide(WorkspaceService.Default),
        Effect.provide(HttpContext.provide(ctx)),
        Effect.provide(ErrorConversionService.Default),
        Effect.provide(StringMixerService.Default),
        Effect.provide(VineValidationService.Default),
        Effect.provide(TypedEffectService.Default),
        Effect.provide(HttpRequestService.Default),
        Effect.catchAll(error =>
          Effect.sync(() =>
            ctx.response.internalServerError({
              success: false,
              message: error?.message ?? 'Unexpected error occurred',
            }),
          ),
        ),
      ),
    )
  }

  async getSignupInviteData({ request, response }: FrameworkHttpContext) {
    const { token, key } = request.params()

    try {
      const result = await this.inviteUserService.verifyNewUserInviteToken({
        token,
        key,
      })

      return response.ok({
        message: 'Invite token verified successfully',
        ...result,
      })
    } catch (error) {
      console.error('Error verifying invite token:', error)
      return response.badRequest({ message: 'Invalid or expired invitation' })
    }
  }

  async completeNewUserSignup({ request, response }: FrameworkHttpContext) {
    const { userUid, tempUserUid, workspaceUid } = request.body()

    try {
      const result = await this.inviteUserService.completeNewUserSignup(userUid, tempUserUid, workspaceUid)

      return response.ok({
        message: 'User signup completed and workspace membership activated',
        ...result,
      })
    } catch (error) {
      console.error('Error completing new user signup:', error)
      return response.internalServerError({ message: 'Failed to complete user signup' })
    }
  }
}
