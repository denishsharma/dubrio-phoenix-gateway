/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import '#modules/iam/routes/auth_route'
import '#modules/channel/routes/channel_route'
import '#modules/iam/routes/account_route'
import '#modules/workspace/routes/workspace_route'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})
