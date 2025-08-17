import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ContactController = () => import('#modules/contact/controllers/contact_controller')

router.group(() => {
  router.post('/list', [ContactController, 'list']).middleware(middleware.auth())
  router.post('/', [ContactController, 'create']).middleware(middleware.auth())
  router.post('/:id', [ContactController, 'update']).middleware(middleware.auth())

  router.get('/', [ContactController, 'listBasic']).middleware(middleware.auth())
  router.get('/:id', [ContactController, 'details']).middleware(middleware.auth())

  router.delete('/:id', [ContactController, 'delete']).middleware(middleware.auth())
}).prefix('contacts')
