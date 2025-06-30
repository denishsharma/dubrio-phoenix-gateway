import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const CHANNEL_TYPE = Enum({
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  INSTAGRAM: 'instagram',
})

export type ChannelType = InferValue<typeof CHANNEL_TYPE>
export const ChannelType = CHANNEL_TYPE.accessor

export const CHANNEL_TYPES = [
  'whatsapp',
  'email',
  'instagram',
] as const
