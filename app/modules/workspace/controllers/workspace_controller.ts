import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import { DataSource } from '#constants/data_source'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseService from '#core/database/services/database_service'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import { WithEmptyResponseData } from '#core/http/constants/with_empty_response_data'
import HttpContext from '#core/http/contexts/http_context'
import HttpRequestService from '#core/http/services/http_request_service'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import UsingResponseEncoder from '#core/http/utils/using_response_encoder'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import VineValidationService from '#core/validation/services/vine_validation_service'
import AuthenticationService from '#modules/iam/services/authentication_service'
import AcceptWorkspaceInvitePayload from '#modules/workspace/payloads/accept_workspace_invite_payload'
import CreateWorkspacePayload from '#modules/workspace/payloads/create_workspace_payload'
import InviteDetailsPayload from '#modules/workspace/payloads/invite_details_payload'
import SendWorkspaceInviteEmailPayload from '#modules/workspace/payloads/send_workspace_invite_email_payload'
import SetActiveWorkspace from '#modules/workspace/payloads/set_active_workspace'
import WorkspaceService from '#modules/workspace/services/workspace_service'
import StringMixerService from '#shared/common/services/string_mixer_service'
import { RetrieveWorkspaceUsingIdentifier } from '#shared/retrieval_strategies/workspace_retrieval_strategy'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import { Effect, Layer, pipe, Schema } from 'effect'

export default class WorkspaceController {
  private telemetryScope = 'authentication-controller'

  /**
   * Handles the creation of a workspace by processing the provided payload.
   *
   * It creates a new workspace for the authenticated user, ensuring that the workspace
   * meets the required criteria and adds the user as a member with the appropriate role.
   */
  async create(ctx: FrameworkHttpContext) {
    return Effect.gen(this, function* () {
      const telemetry = yield* TelemetryService

      return yield* Effect.gen(function* () {
        // TODO: Implement the logic to create a workspace
      }).pipe(
        telemetry.withTelemetrySpan('create_workspace'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  async createWorkspace(ctx: FrameworkHttpContext) {
    return await Effect.gen(function* () {
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const workspaceService = yield* WorkspaceService
      const authenticationService = yield* AuthenticationService

      return yield* Effect.gen(function* () {
        const payload = yield* CreateWorkspacePayload.fromRequest()
        const user = yield* authenticationService.getAuthenticatedUser

        const workspace = yield* workspaceService.createWorkspace(payload, user)

        yield* responseContext.annotateMetadata({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        })

        yield* responseContext.setMessage('Workspace created successfully')

        return yield* pipe(
          DataSource.known({
            id: workspace.id,
            name: workspace.name,
          }),
          UsingResponseEncoder(
            Schema.Struct({
              id: Schema.ULID,
              name: Schema.String,
            }),
          ),
        )
      }).pipe(
        telemetry.withTelemetrySpan('create_workspace'),
        telemetry.withScopedTelemetry('workspace-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  async setActiveWorkspace(ctx: FrameworkHttpContext) {
    return await Effect.gen(function* () {
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      return yield* Effect.gen(function* () {
        const payload = yield* SetActiveWorkspace.fromRequest()

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(WorkspaceIdentifier.make(payload.uid)),
            {
              select: ['uid'],
              exception: {
                throw: true,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
        )

        ctx.session.put('active_workspace', workspace.uid)

        yield* responseContext.setMessage('Active workspace set successfully')

        return WithEmptyResponseData()
      }).pipe(
        telemetry.withTelemetrySpan('set_active_workspace'),
        telemetry.withScopedTelemetry('workspace-controller'),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  async sendWorkspaceInviteEmail(ctx: FrameworkHttpContext) {
    return await Effect.gen(function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const workspaceService = yield* WorkspaceService

      return yield* Effect.gen(function* () {
        const payload = yield* SendWorkspaceInviteEmailPayload.fromRequest()

        const result = yield* workspaceService.sendWorkspaceInviteEmail(payload)

        yield* responseContext.annotateMetadata({
          invitees_count: payload.invitees.length,
          success: result.success,
        })

        yield* responseContext.setMessage(`Successfully sent workspace invites to ${payload.invitees.length} recipients.`)

        return yield* pipe(
          DataSource.known({
            message: `Successfully sent workspace invites to ${payload.invitees.length} recipients.`,
            invitees: payload.invitees,
            success: result.success,
          }),
          UsingResponseEncoder(
            Schema.Struct({
              message: Schema.String,
              invitees: Schema.Array(Schema.String),
              success: Schema.Boolean,
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('send_workspace_invite_email'),
        telemetry.withScopedTelemetry('workspace-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  async acceptInvite(ctx: FrameworkHttpContext) {
    const program = Effect.gen(function* () {
      const workspaceService = yield* WorkspaceService

      const payload = yield* AcceptWorkspaceInvitePayload.fromRequest()

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
