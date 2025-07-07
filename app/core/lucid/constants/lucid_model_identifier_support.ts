import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const LUCID_MODEL_IDENTIFIER_SUPPORT = Enum({
  INTEGER_ID_AS_ID: 'integer_id_as_id',
  ULID_AS_UID: 'ulid_as_uid',
  BOTH: 'both',
})

export type LucidModelIdentifierSupport = InferValue<typeof LUCID_MODEL_IDENTIFIER_SUPPORT>
export const LucidModelIdentifierSupport = LUCID_MODEL_IDENTIFIER_SUPPORT.accessor
