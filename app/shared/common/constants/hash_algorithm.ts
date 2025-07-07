import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const HASH_ALGORITHM = Enum({
  SHA512: 'sha512',
  SHA256: 'sha256',
  MD5: 'md5',
})

export type HashAlgorithm = InferValue<typeof HASH_ALGORITHM>
export const HashAlgorithm = HASH_ALGORITHM.accessor
