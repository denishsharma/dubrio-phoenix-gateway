import router from '@adonisjs/core/services/router'

const AccountController = () => import('#modules/iam/controllers/account_controller')

router.group(() => {
  router.post('/verify/', [AccountController, 'verifyAccount'])
}).prefix('account')
