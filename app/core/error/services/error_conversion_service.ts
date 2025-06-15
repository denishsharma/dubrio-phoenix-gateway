import type { ExceptionOptions } from '#core/error/factories/exception'
import type { InternalErrorOptions } from '#core/error/factories/internal_error'
import type { Merge } from 'type-fest'
import { InternalErrorCode } from '#constants/internal_error_code'
import { KIND_MARKER } from '#constants/proto_marker'
import { ErrorKind } from '#core/error/constants/error_kind'
import UnknownError from '#core/error/errors/unknown_error'
import InternalServerException from '#core/error/exception/internal_server_exception'
import ErrorCauseService from '#core/error/services/error_cause_service'
import ErrorValidationService from '#core/error/services/error_validation_service'
import SchemaError from '#core/schema/errors/schema_error'
import ValidationException from '#core/validation/exceptions/validation_exception'
import RouteNotFoundException from '#exceptions/route_not_found_exception'
import { errors as appErrors } from '@adonisjs/core'
import { Exception as FrameworkException } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'
import { errors as vineErrors } from '@vinejs/vine'
import { defu } from 'defu'
import { Effect, flow, Inspectable, Match, ParseResult, pipe } from 'effect'
import { defaultTo } from 'lodash-es'

export default class ErrorConversionService extends Effect.Service<ErrorConversionService>()('@service/core/error/conversion', {
  dependencies: [ErrorValidationService.Default, ErrorCauseService.Default],
  effect: Effect.gen(function* () {
    const errorValidation = yield* ErrorValidationService
    const errorCause = yield* ErrorCauseService

    function toUnknownError(message?: string, options?: Merge<Omit<InternalErrorOptions, 'cause'>, { context?: { data?: unknown } }>) {
      const resolvedOptions = defu(
        options,
        {
          context: {
            data: undefined,
          },
          code: undefined,
        },
      )

      /**
       * @param error - The unknown error to convert.
       */
      return (error: unknown) =>
        Match.value(error).pipe(
          Match.withReturnType<UnknownError>(),
          /**
           * When the error is an `InternalError` or `Exception` then
           * we need to infer the cause from the error and create
           * a new `UnknownError` with the cause.
           */
          Match.whenOr(
            errorValidation.isInternalError,
            errorValidation.isException,
            err => pipe(
              err,
              errorCause.inferCauseFromError,
              cause => new UnknownError(
                defaultTo(message, err.message),
                {
                  cause,
                  code: defaultTo(resolvedOptions.code, err[KIND_MARKER] === ErrorKind.INTERNAL ? err.code : InternalErrorCode.I_UNKNOWN),
                  context: {
                    data: defu(
                      defaultTo({ context: Inspectable.toJSON(resolvedOptions.context.data) as unknown }, {}),
                      err[KIND_MARKER] === ErrorKind.EXCEPTION ? { __exception__: err.code } : {},
                    ),
                  },
                },
              ),
            ),
          ),

          /**
           * When the error is a `JsonError` then we need to
           * create a new `UnknownError` with the cause.
           */
          Match.when(
            Match.instanceOf(FrameworkException),
            err => pipe(
              err,
              errorCause.inferCauseFromError,
              cause => new UnknownError(
                defaultTo(message, err.message),
                {
                  cause,
                  code: resolvedOptions.code,
                  context: {
                    data: defu(
                      defaultTo({ context: Inspectable.toJSON(resolvedOptions.context.data) as unknown }, {}),
                      { __exception__: err.code },
                    ),
                  },
                },
              ),
            ),
          ),

          /**
           * When the error is a `JsonService` then we need to
           * create a new `UnknownError` with the cause.
           */
          Match.orElse(
            err => pipe(
              err,
              errorCause.inferCauseFromError,
              cause => new UnknownError(
                message,
                {
                  cause: defaultTo(cause, new Error(Inspectable.toStringUnknown(err))),
                  code: resolvedOptions.code,
                  context: {
                    data: resolvedOptions.context.data,
                  },
                },
              ),
            ),
          ),
        )
    }

    function toInternalServerException(message?: string, options?: Omit<ExceptionOptions, 'cause'>) {
      /**
       * @param error - The unknown error to convert.
       */
      return (error: unknown) =>
        Match.value(error).pipe(
          Match.whenOr(
            errorValidation.isInternalError,
            Match.instanceOf(FrameworkException),
            Match.instanceOf(TypeError),
            Match.instanceOf(Error),
            InternalServerException.fromUnknownError(message, options),
          ),
          Match.orElse(flow(
            toUnknownError(),
            InternalServerException.fromUnknownError(message, options),
          )),
        )
    }

    function toKnownExceptionOrUndefined(error: unknown) {
      return Match.value(error).pipe(
        Match.when(errorValidation.isException, err => err),
        Match.when(Match.instanceOf(appErrors.E_ROUTE_NOT_FOUND), RouteNotFoundException.fromFrameworkException()),
        Match.when(Match.instanceOf(vineErrors.E_VALIDATION_ERROR), ValidationException.fromFrameworkException()),
        Match.orElse(() => undefined),
      )
    }

    function toKnownInternalErrorOrUndefined(error: unknown) {
      return Match.value(error).pipe(
        Match.when(errorValidation.isInternalError, err => err),
        Match.when(ParseResult.isParseError, err => new SchemaError(err, undefined, undefined)),
        Match.orElse(() => undefined),
      )
    }

    function toExceptionOrThrowUnknown(error: unknown) {
      return pipe(
        error,
        toKnownExceptionOrUndefined,
        (exception) => {
          if (is.nullOrUndefined(exception)) { throw error }
          return exception
        },
      )
    }

    function toException(message?: string, options?: Omit<ExceptionOptions, 'cause'>) {
      return (error: unknown) => pipe(
        toKnownExceptionOrUndefined(error),
        exception => defaultTo(exception, toInternalServerException(message, options)(error)),
      )
    }

    return {
      /**
       * Convert the given unknown error to an `UnknownError` instance.
       *
       * @param message - A human-readable message for the error.
       * @param options - Additional options for the error.
       */
      toUnknownError,

      /**
       * Convert the given unknown error to an `InternalServerException` instance.
       *
       * @param message - A human-readable message for the error.
       * @param options - Additional options for the error.
       */
      toInternalServerException,

      /**
       * Convert the given unknown error to a known exception or `undefined`.
       *
       * @param error - The unknown error to convert.
       */
      toKnownExceptionOrUndefined,

      /**
       * Convert the given unknown error to a known internal error or `undefined`.
       *
       * @param error - The unknown error to convert.
       */
      toKnownInternalErrorOrUndefined,

      /**
       * Convert the given unknown error to an exception or throw the unknown error
       * if it cannot be converted to an exception.
       *
       * @param error - The unknown error to convert.
       */
      toExceptionOrThrowUnknown,

      /**
       * Convert the given unknown error to an exception, if it cannot be converted
       * to an exception, it will return the `InternalServerException` with the
       * given message and options as the fallback.
       *
       * @param message - A human-readable message for the error.
       */
      toException,
    }
  }),
}) {}
