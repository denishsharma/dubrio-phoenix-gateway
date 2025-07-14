import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SpaceController = () => import('#modules/space/controllers/space_controller')

router.group(() => {
  router.post('/:id', [SpaceController, 'update']).middleware([middleware.auth()])
  router.post('/', [SpaceController, 'create']).middleware([middleware.auth()])

  router.get('/:id', [SpaceController, 'details']).middleware([middleware.auth()])
  router.get('/', [SpaceController, 'list']).middleware([middleware.auth()])

  router.delete('/:id', [SpaceController, 'delete']).middleware([middleware.auth()])
}).prefix('spaces')
