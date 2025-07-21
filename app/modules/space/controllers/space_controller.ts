import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import { workspaceBouncer } from '#abilities/main'
import { DataSource } from '#constants/data_source'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseService from '#core/database/services/database_service'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import { WithEmptyResponseData } from '#core/http/constants/with_empty_response_data'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import UsingResponseEncoder from '#core/http/utils/using_response_encoder'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import ForbiddenActionException from '#exceptions/forbidden_action_exception'
import AuthenticationService from '#modules/iam/services/authentication_service'
import AddSpaceMemberRequestPayload from '#modules/space/payloads/request/add_space_member_request_payload'
import CheckSpaceMemberRequestPayload from '#modules/space/payloads/request/check_space_member_request_payload'
import CreateSpaceRequestPayload from '#modules/space/payloads/request/create_space_request_payload'
import DeleteSpaceRequestPayload from '#modules/space/payloads/request/delete_space_request_payload'
import ListSpaceMembersRequestPayload from '#modules/space/payloads/request/list_space_members_request_payload'
import ListSpaceRequestPayload from '#modules/space/payloads/request/list_space_request_payload'
import RemoveSpaceMemberRequestPayload from '#modules/space/payloads/request/remove_space_member_request_payload'
import RetrieveSpaceDetailsRequestPayload from '#modules/space/payloads/request/retrieve_space_details_request_payload'
import UpdateSpaceRequestPayload from '#modules/space/payloads/request/update_space_request_payload'
import CreateSpacePayload from '#modules/space/payloads/space_manager/create_space_payload'
import DeleteSpacePayload from '#modules/space/payloads/space_manager/delete_space_payload'
import ListSpacePayload from '#modules/space/payloads/space_manager/list_space_payload'
import RetrieveSpaceDetailsPayload from '#modules/space/payloads/space_manager/retrieve_space_details_payload'
import UpdateSpacePayload from '#modules/space/payloads/space_manager/update_space_payload'
import AddSpaceMemberPayload from '#modules/space/payloads/space_member/add_space_member_payload'
import CheckSpaceMemberPayload from '#modules/space/payloads/space_member/check_space_member_payload'
import ListSpaceMembersPayload from '#modules/space/payloads/space_member/list_space_members_payload'
import RemoveSpaceMemberPayload from '#modules/space/payloads/space_member/remove_space_member_payload'
import SpaceService from '#modules/space/services/space_manager_service'
import SpaceMemberService from '#modules/space/services/space_member_service'
import { RetrieveWorkspaceUsingIdentifier } from '#shared/retrieval_strategies/workspace_retrieval_strategy'
import { Effect, pipe, Schema } from 'effect'

export default class SpaceController {
  private telemetryScope = 'space-controller'
  // TODO: Add comments
  async create(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const errorConversion = yield* ErrorConversionService
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService
      const spaceService = yield* SpaceService

      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const payload = yield* CreateSpaceRequestPayload.fromRequest()
        const user = yield* authenticationService.getAuthenticatedUser
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

        const isAllowed = yield* Effect.tryPromise({
          try: async () => await workspaceBouncer.execute(user, workspace),
          catch: errorConversion.toUnknownError('Unexpected error while checking workspace permissions'),
        })

        if (!isAllowed) {
          return new ForbiddenActionException({
            data: {
              action: 'create',
              target: 'space',
              reason: 'You do not have permission to create a space in this workspace.',
            },
          })
        }

        const space = yield* pipe(
          DataSource.known({
            user,
            space: {
              name: payload.name,
              tag: payload.tag,
              icon: payload.icon,
            },
            workspace,
          }),
          CreateSpacePayload.fromSource(),
          Effect.flatMap(spaceService.createSpace),
        )

        yield* responseContext.annotateMetadata({
          name: space.name,
        })

        yield* responseContext.setMessage(`Successfully created space: ${space.name}`)

        return WithEmptyResponseData()
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('create_space'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    })
      .pipe(
        ApplicationRuntimeExecution.runPromise({ ctx }),
      )
  }

  // TODO: Add comments
  async list(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const spaceService = yield* SpaceService
      return yield* Effect.gen(function* () {
        /**
         * list all spaces
         */
        const spaces = yield* pipe(
          ListSpaceRequestPayload.fromRequest(),
          Effect.flatMap(requestPayload =>
            pipe(
              DataSource.known({
                workspace_identifier: requestPayload.workspace_identifier,
              }),
              ListSpacePayload.fromSource(),
              Effect.flatMap(spaceService.list),
            ),
          ),
        )

        yield* responseContext.setMessage('Successfully retrieved all spaces')

        /**
         * Format the spaces to return only the required fields.
         */
        return yield* pipe(
          DataSource.known(spaces),
          UsingResponseEncoder(
            Schema.Array(
              Schema.Struct({
                id: pipe(Schema.ULID, Schema.propertySignature, Schema.fromKey('uid')),
                name: Schema.String,
                tag: Schema.String,
                icon: Schema.optional(Schema.NullOr(Schema.String)),
              }),
            ),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('list_all_spaces'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  /**
   * Retrieve the details of a single space by its identifier.
   * This will ensure that the user has access to the space before returning its details.
   */
  async details(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const spaceService = yield* SpaceService

      return yield* Effect.gen(function* () {
        /**
         * Get the space model using the payload from the request.
         */
        const requestPayload = yield* RetrieveSpaceDetailsRequestPayload.fromRequest()

        const space = yield* pipe(
          DataSource.known({
            workspace_identifier: requestPayload.workspace_identifier,
            space_identifier: requestPayload.space_identifier,
          }),
          RetrieveSpaceDetailsPayload.fromSource(),
          Effect.flatMap(spaceService.details),
        )

        /**
         * Annotate the response message.
         */
        yield* responseContext.setMessage('Details of the space retrieved successfully.')

        return yield* pipe(
          DataSource.known(space),
          UsingResponseEncoder(
            Schema.Struct({
              id: pipe(Schema.ULID, Schema.propertySignature, Schema.fromKey('uid')),
              name: Schema.String,
              tag: Schema.String,
              icon: Schema.optional(Schema.NullOr(Schema.String)),
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('space_details'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  // TODO: Add comments
  async update(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const spaceService = yield* SpaceService

      return yield* Effect.gen(function* () {
        const requestPayload = yield* UpdateSpaceRequestPayload.fromRequest()

        const updatedSpace = yield* pipe(
          requestPayload.mode === 'replace'
            ? DataSource.known({
                workspace_identifier: requestPayload.workspace_identifier,
                space_identifier: requestPayload.space_identifier,
                mode: requestPayload.mode,
                data: requestPayload.data,
              })
            : DataSource.known({
                workspace_identifier: requestPayload.workspace_identifier,
                space_identifier: requestPayload.space_identifier,
                mode: requestPayload.mode,
                data: requestPayload.data,
              }),
          UpdateSpacePayload.fromSource(),
          Effect.flatMap(spaceService.updateSpace),
        )

        yield* responseContext.setMessage(`Successfully updated space: ${updatedSpace.name}`)

        return yield* pipe(
          DataSource.known(updatedSpace),
          UsingResponseEncoder(
            Schema.Struct({
              name: Schema.String,
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('update_space'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  // TODO: Add comments
  async delete(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const spaceService = yield* SpaceService

      return yield* Effect.gen(function* () {
        const requestPayload = yield* DeleteSpaceRequestPayload.fromRequest()

        const deletedSpace = yield* pipe(
          DataSource.known({
            workspace_identifier: requestPayload.workspace_identifier,
            space_identifier: requestPayload.space_identifier,
          }),
          DeleteSpacePayload.fromSource(),
          Effect.flatMap(spaceService.deleteSpace),
        )

        yield* responseContext.setMessage(`Successfully deleted space: ${deletedSpace.name}`)

        return yield* pipe(
          DataSource.known(deletedSpace),
          UsingResponseEncoder(
            Schema.Struct({
              name: Schema.String,
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('delete_space'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  /**
   * Add a user as a member to a space.
   */
  async addMember(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService
      const spaceMemberService = yield* SpaceMemberService

      return yield* Effect.gen(function* () {
        const requestPayload = yield* AddSpaceMemberRequestPayload.fromRequest()
        const user = yield* authenticationService.getAuthenticatedUser

        yield* pipe(
          DataSource.known({
            space_identifier: requestPayload.space_identifier,
            user_identifier: requestPayload.user_identifier,
            requestingUser: user,
          }),
          AddSpaceMemberPayload.fromSource(),
          Effect.flatMap(spaceMemberService.addMember),
        )

        yield* responseContext.setMessage('Successfully added user to space')

        return WithEmptyResponseData()
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('add_space_member'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  /**
   * Remove a user from a space.
   */
  async removeMember(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService
      const spaceMemberService = yield* SpaceMemberService

      return yield* Effect.gen(function* () {
        const requestPayload = yield* RemoveSpaceMemberRequestPayload.fromRequest()
        const user = yield* authenticationService.getAuthenticatedUser

        yield* pipe(
          DataSource.known({
            space_identifier: requestPayload.space_identifier,
            user_identifier: requestPayload.user_identifier,
            requestingUser: user,
          }),
          RemoveSpaceMemberPayload.fromSource(),
          Effect.flatMap(spaceMemberService.removeMember),
        )

        yield* responseContext.setMessage('Successfully removed user from space')

        return WithEmptyResponseData()
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('remove_space_member'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  /**
   * List all members of a space.
   */
  async listMembers(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService
      const spaceMemberService = yield* SpaceMemberService

      return yield* Effect.gen(function* () {
        const requestPayload = yield* ListSpaceMembersRequestPayload.fromRequest()
        const user = yield* authenticationService.getAuthenticatedUser

        const members = yield* pipe(
          DataSource.known({
            space_identifier: requestPayload.space_identifier,
            requestingUser: user,
          }),
          ListSpaceMembersPayload.fromSource(),
          Effect.flatMap(spaceMemberService.listMembers),
        )

        yield* responseContext.setMessage('Successfully retrieved space members')

        return yield* pipe(
          DataSource.known(members),
          UsingResponseEncoder(
            Schema.Array(
              Schema.Struct({
                id: pipe(Schema.ULID, Schema.propertySignature, Schema.fromKey('uid')),
                firstName: Schema.String,
                lastName: Schema.optional(Schema.NullOr(Schema.String)),
                email: Schema.optional(Schema.NullOr(Schema.String)),
              }),
            ),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('list_space_members'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  /**
   * Check if a user is a member of a space.
   */
  async checkMember(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const authenticationService = yield* AuthenticationService
      const spaceMemberService = yield* SpaceMemberService

      return yield* Effect.gen(function* () {
        const requestPayload = yield* CheckSpaceMemberRequestPayload.fromRequest()
        const user = yield* authenticationService.getAuthenticatedUser

        const membershipCheck = yield* pipe(
          DataSource.known({
            space_identifier: requestPayload.space_identifier,
            user_identifier: requestPayload.user_identifier,
            requestingUser: user,
          }),
          CheckSpaceMemberPayload.fromSource(),
          Effect.flatMap(spaceMemberService.checkMember),
        )

        yield* responseContext.setMessage('Successfully checked space membership')

        return yield* pipe(
          DataSource.known(membershipCheck),
          UsingResponseEncoder(
            Schema.Struct({
              isMember: Schema.Boolean,
              membership: Schema.optional(Schema.NullOr(
                Schema.Struct({
                  id: pipe(Schema.ULID, Schema.propertySignature, Schema.fromKey('uid')),
                  firstName: Schema.String,
                  lastName: Schema.optional(Schema.NullOr(Schema.String)),
                  email: Schema.optional(Schema.NullOr(Schema.String)),
                }),
              )),
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('check_space_member'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }
}
