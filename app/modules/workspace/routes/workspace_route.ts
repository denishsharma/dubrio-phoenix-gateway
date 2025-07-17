import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const WorkspaceController = () => import('#modules/workspace/controllers/workspace_controller')

router.group(() => {
  router.post('/', [WorkspaceController, 'create']).middleware([middleware.auth()])

  router.post('/create', [WorkspaceController, 'createWorkspace']).middleware([middleware.auth()])

  router.post('/active', [WorkspaceController, 'setActiveWorkspace']).middleware([middleware.auth()])

  router.post('/invite', [WorkspaceController, 'sendWorkspaceInviteEmail']).middleware([middleware.auth(), middleware.activeWorkspace()])
  router.post('/invite/accept', [WorkspaceController, 'acceptInvite'])
  router.post('/invite/details', [WorkspaceController, 'getInviteDetails'])

  router.get('/', [WorkspaceController, 'list']).middleware([middleware.auth()])
  router.get('/:id', [WorkspaceController, 'details']).middleware([middleware.auth()])
  router.put('/:id', [WorkspaceController, 'update']).middleware([middleware.auth()])
  router.delete('/:id', [WorkspaceController, 'delete']).middleware([middleware.auth()])
}).prefix('workspaces')
