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
import TelemetryService from '#core/telemetry/services/telemetry_service'
import VineValidationService from '#core/validation/services/vine_validation_service'
import AuthenticationService from '#modules/iam/services/authentication_service'
import AcceptWorkspaceInvitePayload from '#modules/workspace/payloads/accept_workspace_invite_payload'
import InviteDetailsPayload from '#modules/workspace/payloads/invite_details_payload'
import CreateWorkspaceRequestPayload from '#modules/workspace/payloads/requests/create_workspace_request_payload'
import DeleteWorkspaceRequestPayload from '#modules/workspace/payloads/requests/delete_workspace_request_payload'
import ListWorkspaceRequestPayload from '#modules/workspace/payloads/requests/list_workspace_request_payload'
import RetrieveWorkspaceDetailsRequestPayload from '#modules/workspace/payloads/requests/retrieve_workspace_details_request_payload'
import SendWorkspaceInviteEmailRequestPayload from '#modules/workspace/payloads/requests/send_workspace_invite_email_request_payload'
import SetActiveWorkspaceRequestPayload from '#modules/workspace/payloads/requests/set_active_workspace_request_payload'
import UpdateWorkspaceDetailsRequestPayload from '#modules/workspace/payloads/requests/update_workspace_details_request_payload'
import CreateWorkspacePayload from '#modules/workspace/payloads/workspace_manager/create_workspace_payload'
import DeleteWorkspacePayload from '#modules/workspace/payloads/workspace_manager/delete_workspace_payload'
import ListWorkspacePayload from '#modules/workspace/payloads/workspace_manager/list_workspace_payload'
import RetrieveWorkspaceDetailsPayload from '#modules/workspace/payloads/workspace_manager/retrieve_workspace_details_payload'
import UpdateWorkspaceDetailsPayload from '#modules/workspace/payloads/workspace_manager/update_workspace_details_payload'
import SetActiveWorkspaceSessionPayload from '#modules/workspace/payloads/workspace_session/set_active_workspace_session_payload'
import WorkspaceManagerService from '#modules/workspace/services/workspace_manager_service'
import WorkspaceService from '#modules/workspace/services/workspace_service'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import StringMixerService from '#shared/common/services/string_mixer_service'
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
      const database = yield* DatabaseService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService
      const workspaceManagerService = yield* WorkspaceManagerService

      return yield* Effect.gen(function* () {
        const payload = yield* CreateWorkspaceRequestPayload.fromRequest()
        const user = yield* authenticationService.getAuthenticatedUser

        const workspace = yield* pipe(
          DataSource.known({
            user,
            workspace: {
              name: payload.name,
              slug: payload.slug,
              website: payload.website,
              logo: payload.logo,
              industry: payload.industry,
            },
          }),
          CreateWorkspacePayload.fromSource(),
          Effect.flatMap(workspaceManagerService.create),
        )

        return workspace
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('create_workspace'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  // // TODO: Remove this method after testing.
  // async createWorkspace(ctx: FrameworkHttpContext) {
  //   return await Effect.gen(function* () {
  //     const responseContext = yield* HttpResponseContextService
  //     const telemetry = yield* TelemetryService

  //     const workspaceService = yield* WorkspaceService
  //     const authenticationService = yield* AuthenticationService

  //     return yield* Effect.gen(function* () {
  //       const payload = yield* CreateWorkspacePayload2.fromRequest()
  //       const user = yield* authenticationService.getAuthenticatedUser

  //       const workspace = yield* workspaceService.createWorkspace(payload, user)

  //       yield* responseContext.annotateMetadata({
  //         workspaceId: workspace.id,
  //         workspaceName: workspace.name,
  //       })

  //       yield* responseContext.setMessage('Workspace created successfully')

  //       return yield* pipe(
  //         DataSource.known({
  //           id: workspace.id,
  //           name: workspace.name,
  //         }),
  //         UsingResponseEncoder(
  //           Schema.Struct({
  //             id: Schema.ULID,
  //             name: Schema.String,
  //           }),
  //         ),
  //       )
  //     }).pipe(
  //       telemetry.withTelemetrySpan('create_workspace'),
  //       telemetry.withScopedTelemetry('workspace-controller'),
  //     )
  //   }).pipe(
  //     ApplicationRuntimeExecution.runPromise({ ctx }),
  //   )
  // }

  async setActiveWorkspace(ctx: FrameworkHttpContext) {
    return await Effect.gen(function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const workspaceSessionService = yield* WorkspaceSessionService
      return yield* Effect.gen(function* () {
        const payload = yield* SetActiveWorkspaceRequestPayload.fromRequest()

        yield* pipe(
          DataSource.known({
            workspace_identifier: WorkspaceIdentifier.make(payload.uid),
          }),
          SetActiveWorkspaceSessionPayload.fromSource(),
          Effect.flatMap(workspaceSessionService.setActiveWorkspace),
        )

        yield* responseContext.setMessage('Active workspace set successfully')

        return WithEmptyResponseData()
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
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
        const payload = yield* SendWorkspaceInviteEmailRequestPayload.fromRequest()

        // TODO: Get active workspace using WorkspaceSessionService

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

  async list(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService
      const workspaceManagerService = yield* WorkspaceManagerService

      return yield* Effect.gen(function* () {
        yield* ListWorkspaceRequestPayload.fromRequest()
        const user = yield* authenticationService.getAuthenticatedUser

        const workspaces = yield* pipe(
          DataSource.known({
            user_identifier: user.id,
          }),
          ListWorkspacePayload.fromSource(),
          Effect.flatMap(workspaceManagerService.list),
        )

        yield* responseContext.setMessage('Successfully retrieved all workspaces')

        return yield* pipe(
          DataSource.known(workspaces),
          UsingResponseEncoder(
            Schema.Array(
              Schema.Struct({
                id: pipe(Schema.ULID, Schema.propertySignature, Schema.fromKey('uid')),
                name: Schema.String,
                slug: Schema.String,
                website: Schema.optional(Schema.NullOr(Schema.String)),
                industry: Schema.optional(Schema.NullOr(Schema.String)),
              }),
            ),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('list_workspaces'),
        telemetry.withScopedTelemetry('workspace-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  async details(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const workspaceManagerService = yield* WorkspaceManagerService

      return yield* Effect.gen(function* () {
        const requestPayload = yield* RetrieveWorkspaceDetailsRequestPayload.fromRequest()

        const workspace = yield* pipe(
          DataSource.known({
            workspace_identifier: requestPayload.workspace_identifier,
          }),
          RetrieveWorkspaceDetailsPayload.fromSource(),
          Effect.flatMap(workspaceManagerService.details),
        )

        yield* responseContext.setMessage('Workspace details retrieved successfully.')

        return yield* pipe(
          DataSource.known(workspace),
          UsingResponseEncoder(
            Schema.Struct({
              id: pipe(Schema.ULID, Schema.propertySignature, Schema.fromKey('uid')),
              name: Schema.String,
              slug: Schema.String,
              website: Schema.optional(Schema.NullOr(Schema.String)),
              industry: Schema.optional(Schema.NullOr(Schema.String)),
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('retrieve_workspace_details'),
        telemetry.withScopedTelemetry('workspace-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  async update(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const workspaceManagerService = yield* WorkspaceManagerService

      return yield* Effect.gen(function* () {
        const requestPayload = yield* UpdateWorkspaceDetailsRequestPayload.fromRequest()

        const updatedWorkspace = yield* pipe(
          requestPayload.mode === 'replace'
            ? DataSource.known({
                workspace_identifier: requestPayload.workspace_identifier,
                mode: requestPayload.mode,
                details: requestPayload.details,
              })
            : DataSource.known({
                workspace_identifier: requestPayload.workspace_identifier,
                mode: requestPayload.mode,
                details: requestPayload.details,
              }),
          UpdateWorkspaceDetailsPayload.fromSource(),
          Effect.flatMap(workspaceManagerService.update),
        )

        yield* responseContext.setMessage(`Successfully updated workspace: ${updatedWorkspace.name}`)

        return yield* pipe(
          DataSource.known(updatedWorkspace),
          UsingResponseEncoder(
            Schema.Struct({
              id: pipe(Schema.ULID, Schema.propertySignature, Schema.fromKey('uid')),
              name: Schema.String,
              slug: Schema.String,
              website: Schema.optional(Schema.NullOr(Schema.String)),
              industry: Schema.optional(Schema.NullOr(Schema.String)),
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('update_workspace'),
        telemetry.withScopedTelemetry('workspace-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  async delete(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const workspaceManagerService = yield* WorkspaceManagerService

      return yield* Effect.gen(function* () {
        const requestPayload = yield* DeleteWorkspaceRequestPayload.fromRequest()

        const deletedWorkspace = yield* pipe(
          DataSource.known({
            workspace_identifier: requestPayload.workspace_identifier,
          }),
          DeleteWorkspacePayload.fromSource(),
          Effect.flatMap(workspaceManagerService.remove),
        )

        yield* responseContext.setMessage(`Successfully deleted workspace: ${deletedWorkspace.name}`)

        return yield* pipe(
          DataSource.known(deletedWorkspace),
          UsingResponseEncoder(
            Schema.Struct({
              name: Schema.String,
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('delete_workspace'),
        telemetry.withScopedTelemetry('workspace-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }
}
