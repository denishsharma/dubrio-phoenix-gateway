import type { InternalErrorOptions } from '#core/error/factories/internal_error'
import type { Merge } from 'type-fest'
import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import SchemaError from '#core/schema/errors/schema_error'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Effect, Option, pipe, Schema } from 'effect'

/**
 * Error occurs when an unknown error is encountered in the application.
 * This error is used to represent any unexpected or unhandled errors that
 * do not fall into specific categories.
 *
 * @category Internal Error
 */
export default class UnknownError extends InternalError('unknown')({
  code: InternalErrorCode.I_UNKNOWN,
}) {
  /**
   *
   * @param message A human-readable message for the error.
   *                If not provided, a default message will be used.
   *                If the message is not provided, it will be set to "An unknown error occurred".
   * @param options
   */
  constructor(message?: string, options?: Merge<InternalErrorOptions, { context?: { data?: unknown } }>) {
    const { context, ...rest } = defu(options, { context: { data: undefined } })
    super(message, rest)

    Object.defineProperty(this, 'data', {
      get: () => {
        return pipe(
          Effect.suspend(() => {
            if (is.undefined(context.data)) { return Effect.succeed(undefined) }
            return Schema.decode(Schema.Unknown, { errors: 'all' })(context.data)
          }),
          Effect.map(Option.liftPredicate(value => !is.undefined(value))),
          SchemaError.fromParseError(),
        )
      },
    })
  }
}
