import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const EXCEPTION_CODE = Enum({
  E_ROUTE_NOT_FOUND: 'E_ROUTE_NOT_FOUND',
  E_VALIDATION: 'E_VALIDATION',
  E_INTERNAL_SERVER: 'E_INTERNAL_SERVER',
  E_FORBIDDEN_ACTION: 'E_FORBIDDEN_ACTION',

  E_RESOURCE_NOT_FOUND: 'E_RESOURCE_NOT_FOUND',
  E_RESOURCE_ALREADY_EXISTS: 'E_RESOURCE_ALREADY_EXISTS',

  E_REQUEST_ENTITY_TOO_LARGE: 'E_REQUEST_ENTITY_TOO_LARGE',

  E_INVALID_CREDENTIALS: 'E_INVALID_CREDENTIALS',
  E_UNAUTHORIZED: 'E_UNAUTHORIZED',
  E_NOT_GUEST_USER: 'E_NOT_GUEST_USER',
  E_PASSWORD_REUSE: 'E_PASSWORD_REUSE',
  E_INVALID_PASSWORD_RESET_TOKEN: 'E_INVALID_PASSWORD_RESET_TOKEN',

  E_ACCOUNT_ALREADY_VERIFIED: 'E_ACCOUNT_ALREADY_VERIFIED',
  E_ACCOUNT_VERIFICATION_REQUIRED: 'E_ACCOUNT_VERIFICATION_REQUIRED',
  E_INVALID_ACCOUNT_VERIFICATION_TOKEN: 'E_INVALID_ACCOUNT_VERIFICATION_TOKEN',

  E_NO_ACTIVE_WORKSPACE: 'E_NO_ACTIVE_WORKSPACE',
  E_WORKSPACE_MEMBER: 'E_WORKSPACE_MEMBER',
  E_WORKSPACE_INVITE: 'E_WORKSPACE_INVITE',
  E_WORKSPACE_NOT_FOUND: 'E_WORKSPACE_NOT_FOUND',
  E_WORKSPACE_ACCESS_DENIED: 'E_WORKSPACE_ACCESS_DENIED',

  E_SPACE_ACCESS_DENIED: 'E_SPACE_ACCESS_DENIED',
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
  [ExceptionCode.E_VALIDATION]: {
    message: 'Validation failed for the request while processing the request payload.',
  },
  [ExceptionCode.E_INTERNAL_SERVER]: {
    message: 'Unexpected error occurred while processing the request and the server is unable to fulfill the request.',
  },
  [ExceptionCode.E_FORBIDDEN_ACTION]: {
    message: 'You do not have necessary permissions to perform the requested action.',
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
  [ExceptionCode.E_PASSWORD_REUSE]: {
    message: 'You cannot reuse a previously used password. Please choose a new password that has not been used before.',
  },
  [ExceptionCode.E_INVALID_PASSWORD_RESET_TOKEN]: {
    message: 'This password reset link is either expired or invalid. Please request a new password reset link to proceed.',
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
  [ExceptionCode.E_WORKSPACE_MEMBER]: {
    message: 'Workspace member error occurred. This could be due to an invalid member or other issues related to workspace members.',
  },
  [ExceptionCode.E_WORKSPACE_INVITE]: {
    message: 'Workspace invite error occurred. This could be due to an invalid invite token or other issues related to workspace invitations.',
  },
  [ExceptionCode.E_WORKSPACE_NOT_FOUND]: {
    message: 'The requested workspace was not found.',
  },
  [ExceptionCode.E_WORKSPACE_ACCESS_DENIED]: {
    message: 'You do not have access to this workspace.',
  },
  [ExceptionCode.E_SPACE_ACCESS_DENIED]: {
    message: 'You do not have access to this space.',
  },
}
