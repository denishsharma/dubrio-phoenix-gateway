import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a password reset token is invalid or expired.
 *
 * This exception is thrown during password reset when the provided
 * token is either invalid, expired, or doesn't match any valid reset request.
 *
 * @category Exception
 */
export default class InvalidResetTokenException extends Exception('invalid_reset_token')({
  status: StatusCodes.BAD_REQUEST,
  code: ExceptionCode.E_INVALID_RESET_TOKEN,
}) {}
