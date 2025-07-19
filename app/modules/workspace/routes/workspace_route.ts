import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const WorkspaceController = () => import('#modules/workspace/controllers/workspace_controller')

router.group(() => {
  router.post('/', [WorkspaceController, 'create'])

  router.post('/active', [WorkspaceController, 'setActiveWorkspace'])

  router.post('/invite', [WorkspaceController, 'sendWorkspaceInviteEmail'])
  router.post('/invite/accept', [WorkspaceController, 'acceptInvite'])
  router.post('/invite/details', [WorkspaceController, 'getInviteDetails'])

  router.get('/', [WorkspaceController, 'list'])
  router.get('/:id', [WorkspaceController, 'details'])
  router.put('/:id', [WorkspaceController, 'update'])
  router.delete('/:id', [WorkspaceController, 'delete'])

  router.group(() => {

  }).prefix('members')
}).prefix('workspaces').middleware([middleware.auth()])
