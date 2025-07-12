/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import router from '@adonisjs/core/services/router'
import { Effect } from 'effect'
import '#modules/iam/routes/auth_route'
import '#modules/channel/routes/channel_route'
import '#modules/iam/routes/account_route'
import '#modules/workspace/routes/workspace_route'
import '#modules/space/routes/space_route'

router.get('/', async (ctx) => {
  return await Effect.gen(function* () {
    const telemetry = yield* TelemetryService
    return yield* Effect.gen(function* () {
      throw new Error('This is a test error')
      return {
        hello: 'world',
      }
    }).pipe(
      telemetry.withTelemetrySpan('get_root_route'),
      telemetry.withScopedTelemetry('phoenix_gateway'),
    )
  }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
})
