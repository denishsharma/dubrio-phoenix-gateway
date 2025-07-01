import router from '@adonisjs/core/services/router'

const WorkspaceController = () => import('#modules/workspace/controllers/workspace_controller')

router.group(() => {
  router.post('/create', [WorkspaceController, 'createWorkspace'])
}).prefix('workspace')
