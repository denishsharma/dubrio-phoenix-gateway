import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when the account verification token is either invalid
 * or expired and cannot be used to verify the user account.
 *
 * @category Exception
 */
export default class InvalidAccountVerificationTokenException extends Exception('invalid_account_verification_token')({
  status: StatusCodes.UNAUTHORIZED,
  code: ExceptionCode.E_INVALID_ACCOUNT_VERIFICATION_TOKEN,
  schema: Schema.Struct({
    reason: Schema.Literal('username_taken', 'unknown', 'token_expired', 'token_invalid'),
  }),
}) {}
