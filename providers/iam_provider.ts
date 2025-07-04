import type { ApplicationService } from '@adonisjs/core/types'
import AccountVerificationService from '#modules/iam/services/account_verification_service'

export default class IamProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton(AccountVerificationService, () => {
      return new AccountVerificationService()
    })
  }

  /**
   * The container bindings have booted
   */
  async boot() {
    // Any initialization logic
  }

  /**
   * The application has been booted
   */
  async start() {
    // Any startup logic
  }

  /**
   * The process has been started
   */
  async ready() {
    // Any ready logic
  }

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {
    // Any shutdown logic
  }
}
