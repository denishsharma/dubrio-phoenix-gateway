import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const CACHE_NAMESPACE = Enum({
  ACCOUNT_VERIFICATION_TOKEN: 'account_verification_token',
  WORKSPACE_INVITE_TOKEN: 'workspace_invite_token',
})

export type CacheNamespace = InferValue<typeof CACHE_NAMESPACE>
export const CacheNamespace = CACHE_NAMESPACE.accessor
