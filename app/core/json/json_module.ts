import JsonService from '#core/json/services/json_service'
import { Layer } from 'effect'

export const CORE_JSON_MODULE_LAYER = Layer.mergeAll(
  JsonService.Default,
)
