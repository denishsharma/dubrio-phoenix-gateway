import WorkspaceService from '#modules/workspace/services/workspace_service'
import { Layer } from 'effect'

export const WORKSPACE_MODULE_LAYER = Layer.mergeAll(
  WorkspaceService.Default,
)
