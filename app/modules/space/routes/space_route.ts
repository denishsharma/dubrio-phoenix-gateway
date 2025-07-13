import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SpaceController = () => import('#modules/space/controllers/space_controller')

router.group(() => {
  router.post('/', [SpaceController, 'create']).middleware([middleware.auth(), middleware.activeWorkspace()])
  router.get('/', [SpaceController, 'listAllSpaces']).middleware([middleware.auth(), middleware.activeWorkspace()])
  // router.put('/:id', [SpaceController, 'updateSpace']).middleware([middleware.auth(), middleware.activeWorkspace()])
}).prefix('spaces')
