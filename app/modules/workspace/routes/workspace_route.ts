import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const WorkspaceController = () => import('#modules/workspace/controllers/workspace_controller')

router.group(() => {
  router.post('/create', [WorkspaceController, 'createWorkspace']).middleware([middleware.auth()])
  router.post('/active', [WorkspaceController, 'setActiveWorkspace']).middleware([middleware.auth()])
  router.post('/invite', [WorkspaceController, 'sendWorkspaceInviteEmail']).middleware([middleware.auth(), middleware.activeWorkspace()])
  router.get('/verify-invite/:token', [WorkspaceController, 'verifyInvite']).middleware([middleware.guest()])
  // router.post('/accept-invite/:token', [WorkspaceController, 'acceptInvite'])
  router.get('/signup-invite/', [WorkspaceController, 'getSignupInviteData'])
  router.post('/complete-signup', [WorkspaceController, 'completeNewUserSignup'])
}).prefix('workspace')
