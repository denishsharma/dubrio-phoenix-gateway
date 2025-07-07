import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when the credentials are invalid
 * during the authentication process.
 *
 * This exception is thrown when the credentials provided
 * are not valid or do not match any existing user.
 *
 * @category Exception
 */
export default class InvalidCredentialsException extends Exception('invalid_credentials')({
  status: StatusCodes.UNAUTHORIZED,
  code: ExceptionCode.E_INVALID_CREDENTIALS,
}) {}
