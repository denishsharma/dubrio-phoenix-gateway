import WorkspaceManagerService from '#modules/workspace/services/workspace_manager_service'
import WorkspaceMemberService from '#modules/workspace/services/workspace_member_service'
import WorkspaceService from '#modules/workspace/services/workspace_service'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import WorkspaceUtilityService from '#modules/workspace/services/workspace_utility_service'
import { Layer } from 'effect'

export const WORKSPACE_MODULE_LAYER = Layer.mergeAll(
  WorkspaceUtilityService.Default,
  WorkspaceSessionService.Default,
  WorkspaceMemberService.Default,
  WorkspaceService.Default,
  WorkspaceManagerService.Default,
)
