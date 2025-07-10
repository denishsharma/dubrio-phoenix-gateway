import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a password reset token is invalid or expired.
 *
 * This exception is thrown during password reset when the provided
 * token is either invalid, expired, or doesn't match any valid reset request.
 *
 * @category Exception
 */
export default class InvalidPasswordResetTokenException extends Exception('invalid_password_reset_token')({
  status: StatusCodes.BAD_REQUEST,
  code: ExceptionCode.E_INVALID_PASSWORD_RESET_TOKEN,
  schema: Schema.Struct({
    reason: Schema.Literal('token_expired', 'token_invalid', 'user_not_found', 'unknown'),
  }),
}) {}
