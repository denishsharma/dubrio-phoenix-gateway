import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseService from '#core/database/services/database_service'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import { WithEmptyResponseData } from '#core/http/constants/with_empty_response_data'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import CreateSpacePayload from '#modules/space/payloads/create_space_payload'
import SpaceService from '#modules/space/services/space_service'
import { Effect } from 'effect'

export default class SpaceController {
  async createSpace(ctx: FrameworkHttpContext) {
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
}
