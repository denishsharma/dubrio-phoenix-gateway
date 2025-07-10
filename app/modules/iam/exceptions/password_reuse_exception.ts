import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a user attempts to reuse a password that has been used previously.
 *
 * This is typically thrown during password change operations when the new password matches
 * a previously used password, violating security policies that prevent password reuse.
 *
 * @category Exception
 */
export default class PasswordReuseException extends Exception('password_reuse')({
  status: StatusCodes.UNPROCESSABLE_ENTITY,
  code: ExceptionCode.E_PASSWORD_REUSE,
}) {}
