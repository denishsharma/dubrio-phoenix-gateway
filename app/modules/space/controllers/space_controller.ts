import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import { DataSource } from '#constants/data_source'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseService from '#core/database/services/database_service'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import { WithEmptyResponseData } from '#core/http/constants/with_empty_response_data'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import UsingResponseEncoder from '#core/http/utils/using_response_encoder'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import CreateSpacePayload from '#modules/space/payloads/create_space_payload'
import DeleteSpacePayload from '#modules/space/payloads/delete_space_payload'
import ListSpacePayload from '#modules/space/payloads/list_space_payload'
import RetrieveSpaceDetailsPayload from '#modules/space/payloads/retrieve_space_details_payload'
import UpdateSpacePayload from '#modules/space/payloads/update_space_payload'
import SpaceService from '#modules/space/services/space_service'
import { Effect, pipe, Schema } from 'effect'

export default class SpaceController {
  async create(ctx: FrameworkHttpContext) {
    return await Effect.gen(function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const spaceService = yield* SpaceService
      return yield* Effect.gen(function* () {
        const payload = yield* CreateSpacePayload.fromRequest()
        const space = yield* spaceService.createSpace(payload)

        yield* responseContext.annotateMetadata({
          name: space.name,
        })

        yield* responseContext.setMessage(`Successfully created space: ${space.name}`)

        return WithEmptyResponseData()
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('create_space'),
        telemetry.withScopedTelemetry('space-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  async list(ctx: FrameworkHttpContext) {
    return await Effect.gen(function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const spaceService = yield* SpaceService
      return yield* Effect.gen(function* () {
        /**
         * list all spaces
         */
        const spaces = yield* pipe(
          ListSpacePayload.fromRequest(),
          Effect.flatMap(spaceService.list),
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
                avatarUrl: Schema.optional(Schema.NullOr(Schema.String)),
              }),
            ),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('list_all_spaces'),
        telemetry.withScopedTelemetry('space-controller'),
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
    return await Effect.gen(function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const spaceService = yield* SpaceService

      return yield* Effect.gen(function* () {
        /**
         * Get the space model using the payload from the request.
         */
        const space = yield* pipe(
          RetrieveSpaceDetailsPayload.fromRequest(),
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
              avatarUrl: Schema.optional(Schema.NullOr(Schema.String)),
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('fetch_space_by_identifier'),
        telemetry.withScopedTelemetry('space-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  async update(ctx: FrameworkHttpContext) {
    return await Effect.gen(function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const spaceService = yield* SpaceService

      return yield* Effect.gen(function* () {
        const payload = yield* UpdateSpacePayload.fromRequest()

        const updatedSpace = yield* spaceService.updateSpace(payload)

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
        telemetry.withScopedTelemetry('space-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }

  async delete(ctx: FrameworkHttpContext) {
    return await Effect.gen(function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const spaceService = yield* SpaceService

      return yield* Effect.gen(function* () {
        const payload = yield* DeleteSpacePayload.fromRequest()
        const deletedSpace = yield* spaceService.deleteSpace(payload)

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
        telemetry.withScopedTelemetry('space-controller'),
      )
    }).pipe(
      ApplicationRuntimeExecution.runPromise({ ctx }),
    )
  }
}
