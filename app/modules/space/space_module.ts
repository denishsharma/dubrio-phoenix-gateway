import AuthenticationService from '#modules/iam/services/authentication_service'
import SpaceService from '#modules/space/services/space_manager_service'
import { Layer } from 'effect'

export const SPACE_MODULE_LAYER = Layer.mergeAll(
  SpaceService.Default,
  AuthenticationService.Default,
)
