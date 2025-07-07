import type { ExceptionOptions } from '#core/error/factories/exception'
import type { errors as vineErrors } from '@vinejs/vine'
import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { defu } from 'defu'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a validation error occurs in the application.
 *
 * @category Exception
 */
export default class ValidationException extends Exception('validation')({
  status: StatusCodes.UNPROCESSABLE_ENTITY,
  code: ExceptionCode.E_VALIDATION,
  schema: Schema.Struct({
    issues: Schema.ArrayEnsure(
      Schema.Struct({
        code: Schema.Literal('custom'),
        path: Schema.Array(Schema.String),
        message: Schema.String,
        params: Schema.Struct({
          rule: Schema.String,
          field: Schema.Struct({
            name: Schema.String,
          }),
          meta: Schema.optionalWith(Schema.Object, { nullable: true }),
        }),
      }),
    ),
  }),
}) {
  /**
   * Creates a new `ValidationException` instance from an `E_VALIDATION_ERROR` framework exception
   * by extracting the issues from the exception messages.
   *
   * @param message - A human-readable message for the exception.
   * @param options - Additional options for the exception.
   */
  static fromFrameworkException(message?: string, options?: Omit<ExceptionOptions, 'cause'>) {
    /**
     * @param exception - The framework exception to convert.
     */
    return (exception: InstanceType<typeof vineErrors.E_VALIDATION_ERROR>) =>
      new ValidationException(
        { data: { issues: exception.messages } },
        message,
        defu(options, { cause: exception }),
      )
  }
}
