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

router.get('/', async () => {
  return {
    hello: 'world',
  }
})
