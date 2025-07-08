import type { ExceptionOptions, InferExceptionSchema } from '#core/error/factories/exception'
import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when the user tries to access a
 * resource or perform an action that requires authentication.
 *
 * This exception is thrown when the user is not authenticated
 * and tries to access a resource or perform an action that
 * is restricted to authenticated users.
 *
 * @category Exception
 */
export default class UnauthorizedException extends Exception('unauthorized')({
  status: StatusCodes.UNAUTHORIZED,
  code: ExceptionCode.E_UNAUTHORIZED,
  schema: Schema.Struct({
    reason: Schema.optionalWith(Schema.Literal('not_authenticated', 'account_verification_required'), { nullable: true, default: () => 'not_authenticated' }),
  }),
}) {
  constructor(reason?: Schema.Schema.Encoded<InferExceptionSchema<UnauthorizedException>>['reason'], message?: string, options?: ExceptionOptions) {
    super({ data: { reason } }, message, options)
  }
}
