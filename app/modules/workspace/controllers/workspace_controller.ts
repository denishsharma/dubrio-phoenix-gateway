import type { HttpContext } from '@adonisjs/core/http'
import Workspace from '#models/workspace_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'

export default class WorkspaceController {
  async createWorkspace({ auth, request, response }: HttpContext) {
    // Since auth middleware is applied, user will always be present
    const user = await auth.use('web').user!

    const workspaceData = request.body()

    // Create the workspace
    const workspace = await Workspace.create(workspaceData)

    // Attach the user as a member (assuming many-to-many relation)
    await workspace.related('users').attach([user.id])

    // Check and update onboarding status
    if (user.onboardingStatus === OnboardingStatus.PENDING) {
      user.onboardingStatus = OnboardingStatus.COMPLETED
      await user.save()
    }

    return response.created({ workspace, onboardingStatus: user.onboardingStatus })
  }
}
