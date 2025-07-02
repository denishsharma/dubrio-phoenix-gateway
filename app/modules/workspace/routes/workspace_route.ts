import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const WorkspaceController = () => import('#modules/workspace/controllers/workspace_controller')

router.group(() => {
  router.post('/create', [WorkspaceController, 'createWorkspace']).middleware([middleware.auth()])
}).prefix('workspace')
