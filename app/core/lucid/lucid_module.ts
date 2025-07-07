import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import LucidUtilityService from '#core/lucid/services/lucid_utility_service'
import { Layer } from 'effect'

export const CORE_LUCID_MODULE_LAYER = Layer.mergeAll(
  LucidUtilityService.Default,
  LucidModelRetrievalService.Default,
)
