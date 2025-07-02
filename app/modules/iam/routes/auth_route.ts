import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AuthenticationController = () => import('#modules/iam/controllers/authentication_controller')

router.group(() => {
  router.post('/register', [AuthenticationController, 'register']).middleware(middleware.guest())
  router.post('/login', [AuthenticationController, 'authenticateWithCredentials']).middleware(middleware.guest())
  router.get('/me', [AuthenticationController, 'me']).middleware(middleware.auth())
}).prefix(`auth`)
