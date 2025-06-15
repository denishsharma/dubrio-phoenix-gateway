import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const ERROR_KIND = Enum({
  INTERNAL: 'internal',
  EXCEPTION: 'exception',
})

export type ErrorKind = InferValue<typeof ERROR_KIND>
export const ErrorKind = ERROR_KIND.accessor
