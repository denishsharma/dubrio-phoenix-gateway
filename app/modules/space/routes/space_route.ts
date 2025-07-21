import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SpaceController = () => import('#modules/space/controllers/space_controller')

router.group(() => {
  router.post('/:id', [SpaceController, 'update'])
  router.post('/', [SpaceController, 'create'])

  router.get('/:id', [SpaceController, 'details'])
  router.get('/', [SpaceController, 'list'])

  router.delete('/:id', [SpaceController, 'delete'])

  // Space Member Routes
  router.post('/:spaceId/members', [SpaceController, 'addMember'])
  router.delete('/:spaceId/members', [SpaceController, 'removeMember'])
  router.get('/:spaceId/members', [SpaceController, 'listMembers'])
  router.get('/:spaceId/members/:userId/check', [SpaceController, 'checkMember'])
}).prefix('spaces').middleware([middleware.auth()])
