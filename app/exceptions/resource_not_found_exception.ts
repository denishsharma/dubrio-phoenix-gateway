import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a requested resource is not found in
 * the application, preventing it from fulfilling the request.
 *
 * @category Exception
 */
export default class ResourceNotFoundException extends Exception('resource_not_found')({
  status: StatusCodes.NOT_FOUND,
  code: ExceptionCode.E_RESOURCE_NOT_FOUND,
  schema: Schema.Struct({
    resource: Schema.Lowercase,
  }),
}) {}
