import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const EXCEPTION_CODE = Enum({
  E_ROUTE_NOT_FOUND: 'E_ROUTE_NOT_FOUND',
  E_VALIDATION: 'E_VALIDATION',
  E_INTERNAL_SERVER: 'E_INTERNAL_SERVER',

  E_RESOURCE_NOT_FOUND: 'E_RESOURCE_NOT_FOUND',
  E_RESOURCE_ALREADY_EXISTS: 'E_RESOURCE_ALREADY_EXISTS',

  E_REQUEST_ENTITY_TOO_LARGE: 'E_REQUEST_ENTITY_TOO_LARGE',

  E_INVALID_CREDENTIALS: 'E_INVALID_CREDENTIALS',
  E_UNAUTHORIZED: 'E_UNAUTHORIZED',
  E_NOT_GUEST_USER: 'E_NOT_GUEST_USER',

  E_ACCOUNT_ALREADY_VERIFIED: 'E_ACCOUNT_ALREADY_VERIFIED',
  E_ACCOUNT_VERIFICATION_REQUIRED: 'E_ACCOUNT_VERIFICATION_REQUIRED',
  E_INVALID_ACCOUNT_VERIFICATION_TOKEN: 'E_INVALID_ACCOUNT_VERIFICATION_TOKEN',

  E_NO_ACTIVE_WORKSPACE: 'E_NO_ACTIVE_WORKSPACE',
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
  [ExceptionCode.E_RESOURCE_NOT_FOUND]: {
    message: 'The requested resource you are looking for could not be found.',
  },
  [ExceptionCode.E_RESOURCE_ALREADY_EXISTS]: {
    message: 'The resource you are trying to create already exists.',
  },
  [ExceptionCode.E_REQUEST_ENTITY_TOO_LARGE]: {
    message: 'The request payload is too large and exceeds the maximum allowed size.',
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

  [ExceptionCode.E_ACCOUNT_ALREADY_VERIFIED]: {
    message: 'This email address is already verified. Please use a different email address to proceed.',
  },
  [ExceptionCode.E_ACCOUNT_VERIFICATION_REQUIRED]: {
    message: 'Your account needs to be verified before you can access this resource or perform the requested action.',
  },
  [ExceptionCode.E_INVALID_ACCOUNT_VERIFICATION_TOKEN]: {
    message: 'This account verification link is either expired or invalid. Please request a new verification link to proceed.',
  },
  [ExceptionCode.E_NO_ACTIVE_WORKSPACE]: {
    message: 'No active workspace found. Please set an active workspace.',
  },
}
