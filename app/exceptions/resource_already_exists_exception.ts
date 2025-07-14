import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { SnakeCaseStringSchema } from '#shared/schemas/general/string'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a requested resource already exists in the
 * application, preventing it from fulfilling the request.
 *
 * @category Exception
 */
export default class ResourceAlreadyExistsException extends Exception('resource_already_exists')({
  status: StatusCodes.CONFLICT,
  code: ExceptionCode.E_RESOURCE_ALREADY_EXISTS,
  schema: Schema.Struct({
    resource: Schema.compose(Schema.Lowercase, SnakeCaseStringSchema),
  }),
}) {}
