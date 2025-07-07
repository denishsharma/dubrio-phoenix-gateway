import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when the user tries to access a resource that
 * is only allowed for guest users and not the authenticated users.
 *
 * This exception is thrown when the user is already authenticated
 * and tries to access a resource or perform an action that is
 * restricted to guest users.
 *
 * @category Exception
 */
export default class NotGuestUserException extends Exception('not_guest_user')({
  status: StatusCodes.CONFLICT,
  code: ExceptionCode.E_NOT_GUEST_USER,
}) {}
