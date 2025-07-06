import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const DATA_PAYLOAD_KIND = Enum({
  DATA: 'data',
  REQUEST: 'request',
})

export type DataPayloadKind = InferValue<typeof DATA_PAYLOAD_KIND>
export const DataPayloadKind = DATA_PAYLOAD_KIND.accessor
