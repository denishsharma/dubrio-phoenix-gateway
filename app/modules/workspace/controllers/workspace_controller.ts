import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import { DataSource } from '#constants/data_source'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseService from '#core/database/services/database_service'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import { WithEmptyResponseData } from '#core/http/constants/with_empty_response_data'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import UsingResponseEncoder from '#core/http/utils/using_response_encoder'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import AuthenticationService from '#modules/iam/services/authentication_service'
import AcceptWorkspaceInvitationRequestPayload from '#modules/workspace/payloads/requests/accept_workspace_invitation_request_payload'
import CreateWorkspaceRequestPayload from '#modules/workspace/payloads/requests/create_workspace_request_payload'
import DeleteWorkspaceRequestPayload from '#modules/workspace/payloads/requests/delete_workspace_request_payload'
import InviteDetailsRequestPayload from '#modules/workspace/payloads/requests/invite_details_request_payload'
import ListWorkspaceRequestPayload from '#modules/workspace/payloads/requests/list_workspace_request_payload'
import RetrieveWorkspaceDetailsRequestPayload from '#modules/workspace/payloads/requests/retrieve_workspace_details_request_payload'
import SendWorkspaceInviteEmailRequestPayload from '#modules/workspace/payloads/requests/send_workspace_invite_email_request_payload'
import SetActiveWorkspaceRequestPayload from '#modules/workspace/payloads/requests/set_active_workspace_request_payload'
import UpdateWorkspaceDetailsRequestPayload from '#modules/workspace/payloads/requests/update_workspace_details_request_payload'
import AcceptWorkspaceInvitationPayload from '#modules/workspace/payloads/workspace_invitation/accept_workspace_invitation_payload'
import QueueWorkspaceInvitationEmailPayload from '#modules/workspace/payloads/workspace_invitation/queue_workspace_invitation_email_payload'
import CreateWorkspacePayload from '#modules/workspace/payloads/workspace_manager/create_workspace_payload'
import DeleteWorkspacePayload from '#modules/workspace/payloads/workspace_manager/delete_workspace_payload'
import ListWorkspacePayload from '#modules/workspace/payloads/workspace_manager/list_workspace_payload'
import RetrieveWorkspaceDetailsPayload from '#modules/workspace/payloads/workspace_manager/retrieve_workspace_details_payload'
import UpdateWorkspaceDetailsPayload from '#modules/workspace/payloads/workspace_manager/update_workspace_details_payload'
import SetActiveWorkspaceSessionPayload from '#modules/workspace/payloads/workspace_session/set_active_workspace_session_payload'
import WorkspaceInvitationService from '#modules/workspace/services/workspace_invitation_service'
import WorkspaceManagerService from '#modules/workspace/services/workspace_manager_service'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import { Effect, pipe, Schema } from 'effect'

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
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService
      const workspaceInvitationService = yield* WorkspaceInvitationService

      return yield* Effect.gen(function* () {
        const payload = yield* SendWorkspaceInviteEmailRequestPayload.fromRequest()
        const user = yield* authenticationService.getAuthenticatedUser

        const result = yield* pipe(
          DataSource.known({
            workspace_identifier: payload.workspace_identifier,
            invited_by_user_identifier: UserIdentifier.make(user.uid),
            invitees: payload.invitees,
          }),
          QueueWorkspaceInvitationEmailPayload.fromSource(),
          Effect.flatMap(workspaceInvitationService.queueInvitationEmail),
        )

        yield* responseContext.setMessage(`Successfully sent workspace invites to ${payload.invitees.length} recipients.`)

        return yield* pipe(
          DataSource.known({
            message: `Successfully sent workspace invites to ${payload.invitees.length} recipients.`,
            success: result.success,
          }),
          UsingResponseEncoder(
            Schema.Struct({
              message: Schema.String,
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
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const telemetry = yield* TelemetryService
      const workspaceInvitationService = yield* WorkspaceInvitationService

      return yield* Effect.gen(function* () {
        const payload = yield* AcceptWorkspaceInvitationRequestPayload.fromRequest()

        const basePayload = {
          token: payload.token,
          mode: payload.mode,
        }

        let dataSourcePayload: any = basePayload

        if (payload.mode === 'register') {
          dataSourcePayload = {
            ...basePayload,
            first_name: payload.first_name,
            last_name: payload.last_name,
            password: payload.password,
          }
        } else if (payload.mode === 'login') {
          dataSourcePayload = {
            ...basePayload,
            password: payload.password,
          }
        }

        const result = yield* pipe(
          DataSource.known(dataSourcePayload),
          AcceptWorkspaceInvitationPayload.fromSource(),
          Effect.flatMap(workspaceInvitationService.acceptInvitation),
        )

        if (result.mode === 'login' && result.userInstance) {
          yield* Effect.tryPromise({
            try: () => ctx.auth.use('web').login(result.userInstance),
            catch: err => err,
          })
        }

        return result
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('accept_workspace_invite'),
        telemetry.withScopedTelemetry('workspace-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  async getInviteDetails(ctx: FrameworkHttpContext) {
    return await Effect.gen(function* () {
      const database = yield* DatabaseService
      const telemetry = yield* TelemetryService
      const workspaceInvitationService = yield* WorkspaceInvitationService

      return yield* Effect.gen(function* () {
        const payload = yield* InviteDetailsRequestPayload.fromRequest()

        const result = yield* workspaceInvitationService.retrieveInvitationDetails(payload.token)

        return result
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('get_invite_details'),
        telemetry.withScopedTelemetry('workspace-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
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
