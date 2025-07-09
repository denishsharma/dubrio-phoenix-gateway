import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a user is not found with the provided email address.
 *
 * This exception is thrown during forgot password, reset password, or other
 * operations that require a valid user account.
 *
 * @category Exception
 */
export default class UserNotFoundException extends Exception('user_not_found')({
  status: StatusCodes.NOT_FOUND,
  code: ExceptionCode.E_USER_NOT_FOUND,
}) {}
