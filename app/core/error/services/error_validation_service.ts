import type { Exception, ExceptionClass } from '#core/error/factories/exception'
import type { InternalError, InternalErrorClass } from '#core/error/factories/internal_error'
import { EXCEPTION_MARKER, INTERNAL_ERROR_MARKER } from '#core/error/constants/error_marker'
import is from '@adonisjs/core/helpers/is'
import { Effect } from 'effect'

export default class ErrorValidationService extends Effect.Service<ErrorValidationService>()('@service/core/error/validation', {
  effect: Effect.gen(function* () {
    function isInternalError<T extends string, A = never, I = never>(error: unknown): error is InternalError<T, A, I> {
      if (!is.object(error) && !is.class(error)) { return false }
      const proto = Object.getPrototypeOf(error)
      const constructor = is.class(error) ? (error as any) : proto.constructor
      return !!constructor && constructor[INTERNAL_ERROR_MARKER] === INTERNAL_ERROR_MARKER
    }

    function isException<T extends string, A = never, I = never>(exception: unknown): exception is Exception<T, A, I> {
      if (!is.object(exception) && !is.class(exception)) { return false }
      const proto = Object.getPrototypeOf(exception)
      const constructor = is.class(exception) ? (exception as any) : proto.constructor
      return !!constructor && constructor[EXCEPTION_MARKER] === EXCEPTION_MARKER
    }

    function internalErrorIsInstanceOf<T extends InternalErrorClass<string, any, any>>(internalError: T) {
      /**
       * @param error - The unknown error to check.
       */
      return (error: unknown): error is T => {
        if (!isInternalError(error)) { return false }
        return error instanceof internalError.constructor
      }
    }

    function exceptionIsInstanceOf<T extends ExceptionClass<string, any, any>>(exception: T) {
      /**
       * @param error - The unknown error to check.
       */
      return (error: unknown): error is T => {
        if (!isException(error)) { return false }
        return error instanceof exception.constructor
      }
    }

    return {
      /**
       * Check if the error is `InternalError`.
       *
       * @param error - The unknown error to check.
       */
      isInternalError,

      /**
       * Check if the error is `Exception`.
       *
       * @param error - The unknown error to check.
       */
      isException,

      /**
       * Check if the error is an instance of the given `InternalError` class.
       *
       * @param internalError - The `InternalError` class to check against.
       */
      internalErrorIsInstanceOf,

      /**
       * Check if the error is an instance of the given `Exception` class.
       *
       * @param exception - The `Exception` class to check against.
       */
      exceptionIsInstanceOf,
    }
  }),
}) {}
