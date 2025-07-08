import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when the user tries to verify an account
 * that has already been verified.
 *
 * @category Exception
 */
export default class AccountAlreadyVerifiedException extends Exception('account_already_verified')({
  status: StatusCodes.CONFLICT,
  code: ExceptionCode.E_ACCOUNT_ALREADY_VERIFIED,
}) {}
