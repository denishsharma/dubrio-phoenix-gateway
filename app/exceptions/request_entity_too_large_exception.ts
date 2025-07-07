import type { ExceptionOptions } from '#core/error/factories/exception'
import type { Exception as FrameworkException } from '@adonisjs/core/exceptions'
import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { defu } from 'defu'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when the request payload is too large.
 * This is typically thrown when the request exceeds the maximum allowed size.
 *
 * @category Exception
 */
export default class RequestEntityTooLargeException extends Exception('request_entity_too_large')({
  status: StatusCodes.REQUEST_TOO_LONG,
  code: ExceptionCode.E_REQUEST_ENTITY_TOO_LARGE,
}) {
  /**
   * Creates a new `RequestEntityTooLargeException` instance from framework exception
   * by extracting the message from the exception.
   *
   * @param message - A human-readable message for the exception.
   * @param options - Additional options for the exception.
   */
  static fromFrameworkException(message?: string, options?: Omit<ExceptionOptions, 'cause'>) {
    /**
     * @param exception - The framework exception to convert.
     */
    return (exception: FrameworkException) => {
      return new RequestEntityTooLargeException(message, defu(options, { cause: exception }))
    }
  }
}
