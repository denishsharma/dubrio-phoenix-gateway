import type { ExceptionOptions } from '#core/error/factories/exception'
import { ExceptionCode } from '#constants/exception_code'
import { InternalErrorCode } from '#constants/internal_error_code'
import { INTERNALS_MARKER } from '#constants/proto_marker'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import { Exception } from '#core/error/factories/exception'
import ErrorCauseService from '#core/error/services/error_cause_service'
import ErrorValidationService from '#core/error/services/error_validation_service'
import SchemaError from '#core/schema/errors/schema_error'
import { Exception as FrameworkException } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'
import app from '@adonisjs/core/services/app'
import { Effect, Layer, Match, Option, pipe, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { defaultTo } from 'lodash-es'

/**
 * Exception occurs when an unexpected error occurs in the application.
 *
 * This exception is used to handle any unexpected errors that
 * occur in the application. It is used as a fallback for any other
 * exception that is not handled by the application.
 *
 * @category Exception
 */
export default class InternalServerException extends Exception('internal_server')({
  status: StatusCodes.INTERNAL_SERVER_ERROR,
  code: ExceptionCode.E_INTERNAL_SERVER,
  schema: Schema.Struct({
    error: Schema.optional(Schema.NullOr(Schema.String)),
  }),
}) {
  /**
   * The flag to indicate if the application is
   * running in debug mode or not.
   *
   * @see {@linkcode app.inProduction}
   */
  protected debug: boolean = !app.inProduction

  constructor(error: unknown, message?: string, options?: Omit<ExceptionOptions, 'cause'>) {
    super({ data: { error: null } }, message, options)

    Effect.runSync(
      pipe(
        Effect.gen(this, function* () {
          const typedEffect = yield* TypedEffectService
          const errorValidation = yield* ErrorValidationService
          const errorCause = yield* ErrorCauseService

          yield* pipe(
            Match.value(error).pipe(
            /**
             * When the error is instance of `InternalError`,
             * then update the cause and stack trace of the error.
             *
             * Set the `data` property of the error to the context data
             * of the internal error if it is not null or undefined.
             */
              Match.when(
                errorValidation.isInternalError,
                err => Effect.sync(() => {
                  const cause = defaultTo(errorCause.inferCauseFromError(err), err)
                  Object.defineProperties(this, {
                    cause: { value: cause },
                    data: {
                      get: () => {
                        return Effect.gen(this, function* () {
                          if (is.nullOrUndefined(this[INTERNALS_MARKER].schema)) { return Option.none() }

                          const schema = Schema.extend(
                            this[INTERNALS_MARKER].schema,
                            Schema.Struct({
                              context: Schema.optional(Schema.Any),
                            }),
                          )

                          return yield* pipe(
                            err.data,
                            SchemaError.fromParseError(`Unexpected error occurred while decoding the internal error context data with tag '${err._tag}.'`),
                            Effect.when(() => this.debug),
                            Effect.map(Option.flatten),
                            Effect.map(
                              Option.match({
                                onNone: () => undefined,
                                onSome: data => data,
                              }),
                            ),
                            Effect.map(data => ({ error: err.code, context: data })),
                            Effect.flatMap(
                              data => Schema.decode(schema, { errors: 'all' })(data).pipe(
                                SchemaError.fromParseError(`Unexpected error occurred while decoding data context for the internal server exception.`, data),
                              ),
                            ),
                            Effect.map(Option.some),
                          )
                        })
                      },
                    },
                  })

                  if (!is.nullOrUndefined(err.stack)) {
                    Object.defineProperty(this, 'stack', { value: err.stack })
                  }
                }),
              ),

              /**
               * When the error is instance of `Exception` from AdonisJS,
               * then update the cause and stack trace of the error.
               *
               * Set the status code and error code from the exception.
               */
              Match.when(
                Match.instanceOf(FrameworkException),
                err => Effect.sync(() => {
                  const cause = defaultTo(errorCause.inferCauseFromError(err), err)
                  Object.defineProperties(this, {
                    cause: { value: cause },
                    status: { value: err.status },
                  })

                  if (!is.nullOrUndefined(err.stack)) {
                    Object.defineProperty(this, 'stack', { value: err.stack })
                  }

                  this.update((draft) => {
                    draft.data.error = err.code
                  })
                }),
              ),

              /**
               * When the error is instance of `TypeError` or `Error`,
               * then update the cause and stack trace of the error.
               */
              Match.whenOr(
                Match.instanceOf(TypeError),
                Match.instanceOf(Error),
                err => Effect.sync(() => {
                  Object.defineProperty(this, 'cause', { value: err })
                  if (!is.nullOrUndefined(err.stack)) {
                    Object.defineProperty(this, 'stack', { value: err.stack })
                  }

                  this.update((draft) => {
                    draft.data.error = InternalErrorCode.I_UNKNOWN
                  })
                }),
              ),

              /**
               * Otherwise, set the error to `InternalErrorCode.I_UNKNOWN`.
               */
              Match.orElse(
                () => Effect.sync(() => {
                  this.update((draft) => {
                    draft.data.error = InternalErrorCode.I_UNKNOWN
                  })
                }),
              ),
            ),
            typedEffect.ensureSuccessType<void>(),
          )
        }),
        Effect.provide(
          Layer.mergeAll(
            TypedEffectService.Default,
            ErrorValidationService.Default,
            ErrorCauseService.Default,
          ),
        ),
      ),
    )
  }

  /**
   * Create a new `InternalServerException` from an unknown error
   * with a message and options to be passed to the constructor.
   *
   * The error will be the cause of the `InternalServerException`.
   *
   * @param message - A human-readable message for the error.
   * @param options - Options to be passed to the constructor.
   */
  static fromUnknownError(message?: string, options?: Omit<ExceptionOptions, 'cause'>) {
    /**
     * @param error - The unknown error to be converted.
     */
    return (error: unknown) => new InternalServerException(error, message, options)
  }
}
