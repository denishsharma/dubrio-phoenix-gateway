/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import router from '@adonisjs/core/services/router'
import { Effect } from 'effect'
import '#modules/iam/routes/auth_route'
import '#modules/channel/routes/channel_route'
import '#modules/iam/routes/account_route'
import '#modules/workspace/routes/workspace_route'

router.get('/', async (ctx) => {
  return await Effect.sync(() => {
    return {
      hello: 'world',
    }
  }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
})
