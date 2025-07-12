import SpaceService from '#modules/space/services/space_service'
import { Layer } from 'effect'

export const SPACE_MODULE_LAYER = Layer.mergeAll(
  SpaceService.Default,
)
