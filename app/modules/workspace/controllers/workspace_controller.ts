import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import HttpContext from '#core/http/contexts/http_context'
import HttpRequestService from '#core/http/services/http_request_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import VineValidationService from '#core/validation/services/vine_validation_service'
import Workspace from '#models/workspace_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import AcceptWorkspaceInvitePayload from '#modules/workspace/payloads/accept_workspace_invite_payload'
import InviteDetailsPayload from '#modules/workspace/payloads/invite_details_payload'
import SendWorkspaceInviteEmailPayload from '#modules/workspace/payloads/send_workspace_invite_email_payload'
import WorkspaceService from '#modules/workspace/services/workspace_service'
import StringMixerService from '#shared/common/services/string_mixer_service'
import vine from '@vinejs/vine'
import { Effect, Layer, pipe } from 'effect'

export default class WorkspaceController {
  private telemetryScope = 'workspace-controller'

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
    return await Effect.gen(this, function* () {
      const telemetry = yield* TelemetryService

      const workspaceService = yield* WorkspaceService

      return yield* Effect.gen(function* () {
        const payload = yield* SendWorkspaceInviteEmailPayload.fromRequest()

        const result = yield* workspaceService.sendWorkspaceInviteEmail(payload)

        return result
      }).pipe(
        telemetry.withTelemetrySpan('send_workspace_invite_email'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  async acceptInvite(ctx: FrameworkHttpContext) {
    const program = Effect.gen(function* () {
      const workspaceService = yield* WorkspaceService

      const payload = yield* AcceptWorkspaceInvitePayload.fromRequest()
      console.log('Accept Invite Payload:', payload)

      const result = yield* workspaceService.acceptInvite(payload)

      if (result.mode === 'login' && result.userInstance) {
        yield* Effect.tryPromise({
          try: () => ctx.auth.use('web').login(result.userInstance),
          catch: err => err,
        })
      }

      return ctx.response.status(200).json(result)
    })

    return await Effect.runPromise(
      pipe(
        program,
        Effect.provide(
          Layer.mergeAll(
            HttpContext.provide(ctx),
            HttpRequestService.Default,
            VineValidationService.Default,
            TypedEffectService.Default,
            WorkspaceService.Default,
            ErrorConversionService.Default,
            StringMixerService.Default,
          ),
        ),
        // Effect.catchAll(error =>
        //   Effect.sync(() =>
        //     ctx.response.internalServerError({
        //       success: false,
        //       message: error?.message ?? 'Unexpected error occurred',
        //     }),
        //   ),
        // ),
      ),
    )
  }

  async getInviteDetails(ctx: FrameworkHttpContext) {
    const program = Effect.gen(function* () {
      const workspaceService = yield* WorkspaceService

      const payload = yield* InviteDetailsPayload.fromRequest()

      const result = yield* workspaceService.getInviteDetails(payload)

      console.log('Invite Details Result:', result)
      return ctx.response.status(200).json(result)
    })

    return Effect.runPromise(
      pipe(
        program,
        Effect.provide(
          Layer.mergeAll(
            WorkspaceService.Default,
            HttpContext.provide(ctx),
            VineValidationService.Default,
            TypedEffectService.Default,
            HttpContext.provide(ctx),
            HttpRequestService.Default,
          ),
        ),
      ),
    )
  }
}
