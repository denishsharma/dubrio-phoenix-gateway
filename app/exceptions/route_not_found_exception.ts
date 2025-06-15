import type { errors as appErrors } from '@adonisjs/core'
import type { ExceptionOptions } from '../core/error/factories/exception.js'
import { defu } from 'defu'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { defaultTo } from 'lodash-es'
import { ExceptionCode } from '../constants/exception_code.js'
import { Exception } from '../core/error/factories/exception.js'

/**
 * Exception occurs when a route is not found in the application.
 *
 * @category Exception
 */
export default class RouteNotFoundException extends Exception('route_not_found')({
  status: StatusCodes.NOT_FOUND,
  code: ExceptionCode.E_ROUTE_NOT_FOUND,
  schema: Schema.Struct({
    method: Schema.Uppercase,
    url: Schema.String,
  }),
}) {
  /**
   * Creates a new `RouteNotFoundException` instance from an `E_ROUTE_NOT_FOUND` framework exception
   * by extracting the method and URL from the exception message.
   *
   * @param message - A human-readable message for the exception.
   * @param options - Additional options for the exception.
   */
  static fromFrameworkException(message?: string, options?: Omit<ExceptionOptions, 'cause'>) {
    /**
     * @param exception - The framework exception to convert.
     */
    return (exception: InstanceType<typeof appErrors.E_ROUTE_NOT_FOUND>) => {
      const pattern = /^Cannot\s+(\S[^:]*):(\S[^:]*)$/
      const matches = pattern.exec(exception.message)
      const [method, url] = matches ? matches.slice(1).map(str => str.trim()) : ['unknown', 'unknown']

      return new RouteNotFoundException(
        { data: { method, url } },
        defaultTo(message, exception.message),
        defu(options, { cause: exception }),
      )
    }
  }
}
