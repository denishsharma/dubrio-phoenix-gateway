import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SpaceController = () => import('#modules/space/controllers/space_controller')

router.group(() => {
  router.post('/:id', [SpaceController, 'update'])
  router.post('/', [SpaceController, 'create'])

  router.get('/:id', [SpaceController, 'details'])
  router.get('/', [SpaceController, 'list'])

  router.delete('/:id', [SpaceController, 'delete'])
}).prefix('spaces').middleware([middleware.auth()])
