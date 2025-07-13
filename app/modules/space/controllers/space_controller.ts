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

  async listAllSpaces(ctx: FrameworkHttpContext) {
    return await Effect.gen(function* () {
      const database = yield* DatabaseService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const spaceService = yield* SpaceService
      return yield* Effect.gen(function* () {
        /**
         * list all spaces
         * This will return an array of spaces with their identifier, name, tag, avatarUrl, and createdAt.
         */
        const spaces = yield* spaceService.listAllSpaces()

        yield* responseContext.setMessage('Successfully retrieved all spaces')

        /**
         * Format the spaces to return only the required fields.
         */
        return yield* pipe(
          DataSource.known(spaces),
          UsingResponseEncoder(
            Schema.Array(
              Schema.Struct({
                identifier: Schema.ULID,
                name: Schema.String,
                tag: Schema.String,
                avatarUrl: Schema.Union(Schema.String, Schema.Null),
                createdAt: Schema.Union(Schema.String, Schema.Null),
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
}
