import router from '@adonisjs/core/services/router'

const AccountController = () => import('#modules/iam/controllers/account_controller')

router.group(() => {
  router.get('/verify', [AccountController, 'verifyAccount'])
  // router.post('/verify/send', [AccountController, 'sendVerificationEmail']).use(middleware.auth())

  // router.get('/username/check', [AccountController, 'checkUsernameAvailability'])
}).prefix('account')
