import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when the user tries to access a space
 * that they do not have permission for.
 *
 * @category Exception
 */
export default class SpaceAccessDeniedException extends Exception('space_access_denied')({
  status: StatusCodes.FORBIDDEN,
  code: ExceptionCode.E_SPACE_ACCESS_DENIED,
}) {}
