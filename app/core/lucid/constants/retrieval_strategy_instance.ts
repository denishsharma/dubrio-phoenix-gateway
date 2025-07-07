import type { LucidModelRetrievalStrategy } from '#core/lucid/factories/lucid_model_retrieval_strategy'
import type { Option } from 'effect'
import { HashMap } from 'effect'

export const RETRIEVAL_STRATEGY_INSTANCE_MAP = HashMap.empty<string, LucidModelRetrievalStrategy<any, any, any, any, any, any, any, any>>()

export const RetrievalStrategyInstance = {
  set: <T extends string, U extends LucidModelRetrievalStrategy<any, any, any, any, any, any, any, any>>(tag: T, instance: U) => {
    if (HashMap.has(RETRIEVAL_STRATEGY_INSTANCE_MAP, tag)) { return }
    HashMap.set(RETRIEVAL_STRATEGY_INSTANCE_MAP, tag, instance)
  },
  get: <T extends string, U = LucidModelRetrievalStrategy<any, any, any, any, any, any, any, any>>(tag: T) => {
    return HashMap.get(RETRIEVAL_STRATEGY_INSTANCE_MAP, tag) as Option.Option<U>
  },
}
