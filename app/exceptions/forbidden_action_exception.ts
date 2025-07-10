import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when the user tries to perform an action that is forbidden
 * and the user does not have the necessary permissions to perform the action.
 *
 * @category Exception
 */
export default class ForbiddenActionException extends Exception('forbidden_action')({
  status: StatusCodes.FORBIDDEN,
  code: ExceptionCode.E_FORBIDDEN_ACTION,
  schema: Schema.Struct({
    action: Schema.Uppercase,
    target: Schema.String,
    reason: Schema.String,
  }),
}) {}
