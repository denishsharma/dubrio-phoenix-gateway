import type { ExceptionCodeMetadata } from '#constants/exception_code'
import type { InternalError } from '#core/error/factories/internal_error'
import type { Exception as FrameworkException } from '@adonisjs/core/exceptions'
import type { Brand } from 'effect'
import type { StatusCodes } from 'http-status-codes'
import type { Draft } from 'mutative'
import type { Spread } from 'type-fest'
import { EXCEPTION_CODE_METADATA, ExceptionCode } from '#constants/exception_code'
import { INTERNALS_MARKER, KIND_MARKER } from '#constants/proto_marker'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import { ErrorKind } from '#core/error/constants/error_kind'
import { EXCEPTION_MARKER } from '#core/error/constants/error_marker'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Data, Effect, Match, Option, pipe, Schema } from 'effect'
import { defaultTo, get, has, omit } from 'lodash-es'
import { create } from 'mutative'

/**
 * The options for customizing the exception instance
 * that is thrown when something goes wrong.
 */
export interface ExceptionOptions {
  /**
   * The HTTP status code to be returned to the client
   * when the exception is thrown.
   *
   * @see {@link StatusCodes} for more details on the status codes.
   */
  status?: StatusCodes;

  /**
   * Unique exception code for the exception to be used in the
   * error response and tracking systems to identify the exception
   * and categorize it.
   *
   * @see {@link ExceptionCode} for more details on the exception codes.
   */
  code?: ExceptionCode;

  /**
   * The original error that caused this exception to be thrown.
   *
   * This is useful for debugging and logging purposes to understand the
   * root cause of the exception.
   *
   * @see {@link FrameworkException} for more details on the AdonisJS exception class.
   * @see {@link InternalError} for more details on the internal error class.
   */
  cause?: Error | FrameworkException | InternalError<string, any, any>;
}

/**
 * The options for creating an exception instance via
 * the static `make` method of the `Exception` class.
 */
export type ExceptionMakeOptions<I = never> = Spread<
  & ExceptionOptions
  & {
    /**
     * A human-readable message that describes the exception.
     */
    message?: string;
  },
  [I] extends [never]
    ? object
    : {
      /**
       * The additional context data that is associated with the exception
       * to provide more information about the error.
       */
        context: {
          data: I;
        };
      }
>

/**
 * The constructor parameters for creating an exception instance.
 * via the constructor of the `Exception` class.
 */
export type ExceptionConstructorParameters<I = never> = [I] extends [never]
  ? [message?: string, options?: ExceptionOptions]
  : [context: { data: I }, message?: string, options?: ExceptionOptions]

/**
 * The internals of the exception class that are used to
 * store the configuration and state of the exception.
 */
interface ExceptionInternals<A = never, I = never> {
  schema: Schema.Schema<A, I>;
  context: {
    data: {
      /**
       * The encoded context data that is associated with the exception
       * to provide more information about the error.
       *
       * To be used when decoding the context data with the schema.
       */
      encoded: I | undefined;
    };
  };
}

/**
 * The options for customizing the factory function that creates
 * the exception class.
 */
interface ExceptionFactoryOptions<A = never, I = never> {
  /**
   * The HTTP status code to be returned to the client
   * when the exception is thrown.
   *
   * @see {@link StatusCodes} for more details on the status codes.
   */
  status: StatusCodes;

  /**
   * Unique exception code for the exception to be used in the
   * error response and tracking systems to identify the exception
   * and categorize it.
   *
   * @see {@link ExceptionCode} for more details on the exception codes.
   */
  code: ExceptionCode;

  /**
   * The metadata for the exception code that provides additional information
   * about the exception code.
   *
   * Defaults to the metadata of the exception code.
   *
   * @see {@link ExceptionCodeMetadata} for more details on the exception code metadata.
   */
  metadata?: Partial<ExceptionCodeMetadata>;

  /**
   * The schema for the exception that is used to validate the context data
   * and encode/decode the context data.
   *
   * @see {@link Schema} for more details on the schema.
   */
  schema?: Schema.Schema<A, I>;
}

/**
 * Base factory function for creating a base exception class that extends
 * the `Data.Error` class and provides additional functionality for handling
 * exceptions in the application.
 */
function base<T extends string, A = never, I = never>(tag: T, factoryOptions: ExceptionFactoryOptions<A, I>) {
  class Factory extends Data.Error {
    static get [EXCEPTION_MARKER]() { return EXCEPTION_MARKER }

    readonly _tag: T = tag
    readonly [KIND_MARKER]: typeof ErrorKind.EXCEPTION = ErrorKind.EXCEPTION

    get [Symbol.toStringTag]() { return this._tag }

    /**
     * The HTTP status code to be returned to the client
     * when the exception is thrown.
     *
     * @see {@link StatusCodes} for more details on the status codes.
     */
    readonly status: StatusCodes

    /**
     * Unique exception code for the exception to be used in the
     * error response and tracking systems to identify the exception
     * and categorize it.
     *
     * @see {@link ExceptionCode}
     */
    readonly code: ExceptionCode

    /**
     * The metadata for the exception code that provides additional information
     * about the exception code.
     *
     * @see {@link ExceptionCodeMetadata}
     */
    readonly metadata: ExceptionCodeMetadata

    /**
     * A human-readable message that describes the exception.
     */
    readonly message: string

    /**
     * The original error that caused this exception to be thrown.
     *
     * This is useful for debugging and logging purposes to understand the
     * root cause of the exception.
     *
     * @see {@link FrameworkException} for more details on the AdonisJS exception class.
     * @see {@link InternalError} for more details on the internal error class.
     */
    readonly cause: Error | FrameworkException | InternalError<string, any, any> | undefined

    /**
     * The stack trace of the exception that provides information about the
     * sequence of function calls that led to the exception being thrown.
     *
     * It may be `undefined` if the stack trace is not available or the
     * cause is not an error.
     */
    readonly stack?: string

    /**
     * The internals of the exception class that are used to
     * store the configuration and state of the exception.
     */
    readonly [INTERNALS_MARKER]: ExceptionInternals<A, I> = {
      schema: defaultTo(factoryOptions.schema, Schema.Never) as Schema.Schema<A, I>,
      context: {
        data: {
          encoded: undefined,
        },
      },
    }

    constructor(...args: ExceptionConstructorParameters<I>) {
      super()

      interface ExceptionConstructorArguments {
        contextOrMessage: string | { data: I } | undefined;
        messageOrOptions: string | ExceptionOptions | undefined;
        options: ExceptionOptions | undefined;
      }

      /**
       * Resolve the arguments to get the context, code, status, metadata, and cause
       * for the exception.
       */
      const resolvedArguments = Match.type<ExceptionConstructorArguments>().pipe(
        Match.withReturnType<{
          context: { data: I | undefined };
          code: ExceptionCode;
          status: StatusCodes;
          metadata: ExceptionCodeMetadata;
          cause: Error | FrameworkException | InternalError<string, any, any> | undefined;
        }>(),
        Match.when(
          ({ contextOrMessage }) => is.object(contextOrMessage),
          ({ contextOrMessage, messageOrOptions, options }) => {
            const code = defaultTo(options?.code, factoryOptions.code)
            return {
              code,
              cause: options?.cause,
              status: defaultTo(options?.status, factoryOptions.status),
              context: { data: (contextOrMessage as { data: I }).data },
              metadata: defu(
                {
                  message: messageOrOptions as string,
                } as ExceptionCodeMetadata,
                factoryOptions.metadata,
                defaultTo(get(EXCEPTION_CODE_METADATA, code), EXCEPTION_CODE_METADATA[ExceptionCode.E_INTERNAL_SERVER]),
              ),
            }
          },
        ),
        Match.orElse(
          ({ contextOrMessage, messageOrOptions }) => {
            const code = defaultTo((messageOrOptions as ExceptionOptions | undefined)?.code, factoryOptions.code)
            return {
              code,
              cause: (messageOrOptions as ExceptionOptions | undefined)?.cause,
              status: defaultTo((messageOrOptions as ExceptionOptions | undefined)?.status, factoryOptions.status),
              context: { data: undefined },
              metadata: defu(
                {
                  message: contextOrMessage as string,
                } as ExceptionCodeMetadata,
                factoryOptions.metadata,
                defaultTo(get(EXCEPTION_CODE_METADATA, code), EXCEPTION_CODE_METADATA[ExceptionCode.E_INTERNAL_SERVER]),
              ),
            }
          },
        ),
      )({ contextOrMessage: args[0], messageOrOptions: args[1], options: args[2] })

      /**
       * Update the internals of the exception class.
       */
      this[INTERNALS_MARKER].context.data.encoded = resolvedArguments.context.data

      /**
       * Set the properties of the exception class.
       */
      this.status = resolvedArguments.status
      this.code = resolvedArguments.code
      this.metadata = resolvedArguments.metadata
      this.cause = resolvedArguments.cause
      this.message = resolvedArguments.metadata.message

      /**
       * Set the stack trace of the exception if the cause is error
       * and the stack trace is available.
       */
      if (this.cause && has(this.cause, 'stack')) {
        this.stack = this.cause.stack
      }

      /**
       * Capture the error stack trace if stack trace is not available
       * and the cause is not an error.
       */
      if (is.nullOrUndefined(this.stack)) {
        Error.captureStackTrace(this, this.cause ?? Object.getPrototypeOf(this).constructor)
      }
    }

    /**
     * The string representation of the exception instance
     * that includes the code, status and message.
     */
    toString() {
      return `<${this._tag}> ${this.status} [${this.code}]: ${this.message}`
    }

    /**
     * The JSON representation of the exception instance
     * that includes the essential information about the exception.
     */
    toJSON() {
      return {
        _tag: this._tag,
        _kind: this[KIND_MARKER],
        status: this.status,
        code: this.code,
        message: this.message,
        metadata: this.metadata,
        cause: is.error(this.cause)
          ? {
              name: this.cause.name,
              message: this.cause.message,
              stack: this.cause.stack,
            }
          : this.cause,
        data: this[INTERNALS_MARKER].context.data.encoded,
        stack: this.stack,
      }
    }

    /**
     * Decodes the context data of the exception instance
     * using the schema defined in the factory options.
     */
    get data() {
      return Effect.gen(this, function* () {
        const typedEffect = yield* TypedEffectService
        return yield* pipe(
          Effect.suspend(() => {
            if (is.undefined(this[INTERNALS_MARKER].context.data.encoded)) { return Effect.succeed(undefined) }
            return Schema.decode(this[INTERNALS_MARKER].schema, { errors: 'all' })(this[INTERNALS_MARKER].context.data.encoded)
          }),
          Effect.map(Option.liftPredicate(value => !is.undefined(value))),
          typedEffect.overrideSuccessType<Option.Option<Exclude<A, undefined>>>(),
        )
      }).pipe(Effect.provide(TypedEffectService.Default))
    }

    /**
     * Updates the encoded context data of the exception instance
     * using the updater function provided.
     *
     * @param updater - The updater function to update the context data.
     *
     * @see {@link create} for more information on the updater function.
     */
    update(updater: [I] extends [never] ? void : (draft: Draft<{ data: I }>) => void) {
      if (is.undefined(this[INTERNALS_MARKER].context.data.encoded) || !is.function(updater)) { return }
      this[INTERNALS_MARKER].context.data.encoded = create({ data: this[INTERNALS_MARKER].context.data.encoded }, updater).data
    }
  }
  ;(Factory.prototype as any).name = tag
  return Factory
}

/**
 * Instance type of the base exception class that is created
 * using the factory function.
 */
type BaseInstance<T extends string, A = never, I = never> = InstanceType<ReturnType<typeof base<T, A, I>>>

/**
 * Factory function for creating a exception class with the unique tag
 * and the options provided to the factory function.
 *
 * Tag is prefixed with `@error/exception/` to ensure uniqueness and to
 * avoid conflicts with other exception classes in the application.
 *
 * @see {@link ExceptionFactoryOptions} for more information on the options.
 */
export function Exception<T extends string>(tag: T) {
  type RT = `@error/exception/${T}`
  const resolvedTag = `@error/exception/${tag}` as RT

  return <A = never, I = never>(factoryOptions: ExceptionFactoryOptions<A, I>) => {
    class BaseException extends base<RT, A, I>(resolvedTag, factoryOptions) {
      /**
       * Makes a new instance of the exception class with the options provided
       * to the exception class.
       *
       * @param options - The options to create the exception instance.
       *
       * @see {@link ExceptionMakeOptions} for more information on the options.
       */
      static make<E extends BaseException>(this: new (...args: ExceptionConstructorParameters<I>) => E, options: ExceptionMakeOptions<I>) {
        if (has(options, 'context') && has(options.context, 'data')) {
          const args = [
            options.context,
            options.message,
            omit(options, 'context', 'message'),
          ] as unknown as ExceptionConstructorParameters<I>
          return new this(...args)
        }

        const args = [options.message, omit(options, 'message')] as unknown as ExceptionConstructorParameters<I>
        return new this(...args)
      }
    }
    ;(BaseException.prototype as any).name = resolvedTag
    ;(BaseException as any).__tag__ = resolvedTag

    return BaseException as unknown as (new (...args: ExceptionConstructorParameters<I>) => Brand.Branded<InstanceType<typeof BaseException>, typeof EXCEPTION_MARKER>) & { make: typeof BaseException['make']; readonly [EXCEPTION_MARKER]: typeof EXCEPTION_MARKER }
  }
}

/**
 * The instance type of the exception class that is created
 * using the exception factory function.
 */
export type Exception<T extends string, A = never, I = never> = Brand.Branded<BaseInstance<T, A, I>, typeof EXCEPTION_MARKER>

/**
 * The type of the exception class that is created using
 * the exception factory function.
 */
export type ExceptionClass<T extends string, A = never, I = never>
  = & (new (...args: ExceptionConstructorParameters<I>) => Exception<T, A, I>)
    & { make: (options: ExceptionMakeOptions<I>) => Brand.Brand.Unbranded<Exception<T, A, I>>; readonly [EXCEPTION_MARKER]: typeof EXCEPTION_MARKER }

/**
 * Helper type to infer the schema type of the exception class or instance.
 */
export type InferExceptionSchema<T extends Exception<string, any, any> | ExceptionClass<string, any, any>>
  = T extends Exception<string, infer A, infer I>
    ? Schema.Schema<A, I>
    : T extends ExceptionClass<string, infer A, infer I>
      ? Schema.Schema<A, I>
      : never
