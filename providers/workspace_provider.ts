import type { ApplicationService } from '@adonisjs/core/types'
import InviteUserService from '#modules/workspace/services/invite_user_service'

export default class WorkspaceProvider {
  constructor(protected app: ApplicationService) {}

  async register() {
    this.app.container.singleton(InviteUserService, () => {
      return new InviteUserService()
    })
  }

  async boot() {
    // Any boot logic can be added here
  }

  async start() {
    // Any start logic can be added here
  }

  async ready() {
    // Any ready logic can be added here
  }

  async shutdown() {
    // Any shutdown logic can be added here
  }
}
