import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const CACHE_NAMESPACE = Enum({
  ACCOUNT_VERIFICATION_TOKEN: 'account_verification_token',
})

export type CacheNameSpace = InferValue<typeof CACHE_NAMESPACE>
export const CacheNameSpace = CACHE_NAMESPACE.accessor
