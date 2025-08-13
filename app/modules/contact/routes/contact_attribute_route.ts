import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ContactAttributeController = () => import('#modules/contact/controllers/contact_attribute_controller')
router.group(() => {
  router.post('/', [ContactAttributeController, 'create']).middleware(middleware.auth())
}).prefix('contact-attributes')
