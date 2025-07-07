import type { ApplicationService } from '@adonisjs/core/types'
import ZodValidationErrorReporter from '#core/validation/reporters/zod_validation_error_reporter'
import extensions from '#start/extensions'
import { BaseModel, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import vine from '@vinejs/vine'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * The container bindings have booted
   */
  async boot() {
    /**
     * Load the extensions to extend the application
     */
    for (const extension of extensions) {
      await extension()
    }

    /**
     * Set the naming strategy for the Lucid models
     * to snake case
     */
    BaseModel.namingStrategy = new SnakeCaseNamingStrategy()

    /**
     * Register the Vine error reporter
     * to use the Zod validation error reporter.
     */
    vine.errorReporter = () => new ZodValidationErrorReporter()
  }

  /**
   * The application has been booted
   */
  async start() {
    /**
     * Load the runtime for the application
     *
     * This will load all the dependencies required for
     * the application runtime
     */
    await import('#start/runtime')
  }
}
