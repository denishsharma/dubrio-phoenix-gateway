import AuthenticationService from '#modules/iam/services/authentication_service'
import SpaceService from '#modules/space/services/space_manager_service'
import SpaceMemberService from '#modules/space/services/space_member_service'
import { Layer } from 'effect'

export const SPACE_MODULE_LAYER = Layer.mergeAll(
  SpaceService.Default,
  SpaceMemberService.Default,
  AuthenticationService.Default,
)
