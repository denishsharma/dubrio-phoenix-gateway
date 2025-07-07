import DatabaseService from '#core/database/services/database_service'
import { Layer } from 'effect'

export const CORE_DATABASE_MODULE_LAYER = Layer.mergeAll(
  DatabaseService.Default,
)
