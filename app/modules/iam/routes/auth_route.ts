import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AuthenticationController = () => import('#modules/iam/controllers/authentication_controller')

router.group(() => {
  router.post('/register', [AuthenticationController, 'registerUser']).middleware(middleware.guest())
  router.post('/login', [AuthenticationController, 'authenticateWithCredentials']).middleware(middleware.guest())
  router.post('/forgot-password', [AuthenticationController, 'forgotPassword']).middleware(middleware.guest())
  router.post('/reset-password', [AuthenticationController, 'resetPassword']).middleware(middleware.guest())
  router.get('/me', [AuthenticationController, 'me']).middleware(middleware.auth())
}).prefix('auth')
