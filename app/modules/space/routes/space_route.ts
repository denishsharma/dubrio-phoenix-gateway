import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SpaceController = () => import('#modules/space/controllers/space_controller')

router.group(() => {
  router.get('/', [SpaceController, 'list']).middleware([middleware.auth(), middleware.activeWorkspace()])
  router.get('/:id', [SpaceController, 'details']).middleware([middleware.auth(), middleware.activeWorkspace()])

  router.post('/', [SpaceController, 'create']).middleware([middleware.auth(), middleware.activeWorkspace()])
  router.post('/:id', [SpaceController, 'update']).middleware([middleware.auth(), middleware.activeWorkspace()])

  router.delete('/:id', [SpaceController, 'delete']).middleware([middleware.auth(), middleware.activeWorkspace()])
}).prefix('spaces')
