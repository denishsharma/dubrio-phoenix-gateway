import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AuthenticationController = () => import('#modules/iam/controllers/authentication_controller')

router.group(() => {
  router.post('/register', [AuthenticationController, 'register'])
  router.post('/login', [AuthenticationController, 'verifyCredentials'])
  router.get('/me', [AuthenticationController, 'me']).middleware(middleware.auth())
  router.get('/verify', [AuthenticationController, 'verifyEmail'])
}).prefix(`auth`)
