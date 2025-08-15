import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ContactAttributeController = () => import('#modules/contact/controllers/contact_attribute_controller')
router.group(() => {
  router.post('/', [ContactAttributeController, 'create']).middleware(middleware.auth())
  router.post('/:id', [ContactAttributeController, 'update']).middleware(middleware.auth())
  router.get('/', [ContactAttributeController, 'list']).middleware(middleware.auth())
  router.get('/:id', [ContactAttributeController, 'details']).middleware(middleware.auth())
  router.delete('/:id', [ContactAttributeController, 'delete']).middleware(middleware.auth())
}).prefix('contact-attributes')
