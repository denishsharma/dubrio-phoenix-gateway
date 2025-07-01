import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const EXCEPTION_CODE = Enum({
  E_ROUTE_NOT_FOUND: 'E_ROUTE_NOT_FOUND',
  E_VALIDATION: 'E_VALIDATION',
  E_INTERNAL_SERVER: 'E_INTERNAL_SERVER',
})

export type ExceptionCode = InferValue<typeof EXCEPTION_CODE>
export const ExceptionCode = EXCEPTION_CODE.accessor

export interface ExceptionCodeMetadata {
  /**
   * A human-readable message describing the exception.
   */
  message: string;
}

export const EXCEPTION_CODE_METADATA: Record<ExceptionCode, ExceptionCodeMetadata> = {
  [ExceptionCode.E_ROUTE_NOT_FOUND]: {
    message: 'Could not find the requested route for the requested method.',
  },
  [ExceptionCode.E_INTERNAL_SERVER]: {
    message: 'Unexpected error occurred while processing the request and the server is unable to fulfill the request.',
  },
  [ExceptionCode.E_VALIDATION]: {
    message: 'Validation failed for the request while processing the request payload.',
  },
}
