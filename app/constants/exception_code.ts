import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const EXCEPTION_CODE = Enum({
  E_ROUTE_NOT_FOUND: 'E_ROUTE_NOT_FOUND',
  E_VALIDATION: 'E_VALIDATION',
  E_INTERNAL_SERVER: 'E_INTERNAL_SERVER',

  E_INVALID_CREDENTIALS: 'E_INVALID_CREDENTIALS',
  E_UNAUTHORIZED: 'E_UNAUTHORIZED',
  E_NOT_GUEST_USER: 'E_NOT_GUEST_USER',
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
  [ExceptionCode.E_INVALID_CREDENTIALS]: {
    message: 'The credentials you provided are invalid and cannot be used to authenticate you.',
  },
  [ExceptionCode.E_UNAUTHORIZED]: {
    message: 'You must be logged-in to access this resource or perform the requested action.',
  },
  [ExceptionCode.E_NOT_GUEST_USER]: {
    message: 'You are already authenticated. Requested action or resource is only available for guest users.',
  },
}
