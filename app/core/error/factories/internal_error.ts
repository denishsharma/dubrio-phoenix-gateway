import type { InternalErrorCodeMetadata } from '#constants/internal_error_code'
import type { Exception as FrameworkException } from '@adonisjs/core/exceptions'
import type { Draft } from 'mutative'
import type { Spread } from 'type-fest'
import { INTERNAL_ERROR_CODE_METADATA, InternalErrorCode } from '#constants/internal_error_code'
import { INTERNALS_MARKER, KIND_MARKER } from '#constants/proto_marker'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import { ErrorKind } from '#core/error/constants/error_kind'
import { INTERNAL_ERROR_MARKER } from '#core/error/constants/error_marker'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { type Brand, Data, Effect, Match, Option, pipe, Schema } from 'effect'
import { defaultTo, get, has, omit } from 'lodash-es'
import { create } from 'mutative'

/**
 * Internal error options interface.
 * This interface defines the options that can be passed to the internal error factory.
 * It includes an optional error code and an optional cause.
 */
export interface InternalErrorOptions {

  /**
   * An optional error code that identifies the specific internal error.
   * This code is used for logging and debugging purposes.
   * It should be one of the predefined internal error codes.
   * @see InternalErrorCode
   */
  code?: InternalErrorCode;

  /**
   * An optional cause that represents the original error that triggered the internal error.
   * This can be used to provide additional context and information about the error.
   */
  cause?: Error | FrameworkException | InternalError<string, any, any>;
}

/**
 * Internal error internals interface.
 * This interface defines the internal structure of the internal error.
 * It includes an optional schema for additional arguments and instance types,
 * as well as a context object that contains encoded data.
 */
interface InternalErrorInternals<A = never, I = never> {
  /**
   * An optional schema that defines the structure of additional arguments and instance types for the internal error.
   * This can be used to validate and enforce the types of arguments passed to the error.
   */
  schema: Schema.Schema<A, I>;

  /**
   * An optional context object that contains encoded data related to the internal error.
   * This can be used to store additional information about the error, such as its state or context.
   */
  context: {
    data: {
      encoded: I | undefined;
    };
  };
}

/**
 * The options for creating an internal error instance via
 * the static `make` method of the `InternalError` class.
 */
export type InternalErrorMakeOptions<I = never> = Spread<
  & InternalErrorOptions
  & {
    /**
     * A human-readable message that describes the error.
     */
    message?: string;
  },
  [I] extends [never]
    ? object
    : {
      /**
       * The additional context data that is associated with the error
       * to provide more information about the error.
       */
        context: {
          data: I;
        };
      }
>

/**
 * The constructor parameters for creating an internal error instance
 * via the constructor of the `InternalError` class.
 */
export type InternalErrorConstructorParameters<I = never> = [I] extends [never]
  ? [message?: string, options?: InternalErrorOptions]
  : [context: { data: I }, message?: string, options?: InternalErrorOptions]

/**
 * The internals of the internal error class that are used to
 * store the configuration and state of the error.
 */
interface InternalErrorInternals<A = never, I = never> {
  schema: Schema.Schema<A, I>;
  context: {
    data: {
      /**
       * The encoded context data that is associated with the error
       * to provide more information about the error.
       *
       * To be used when decoding the context data with the schema.
       */
      encoded: I | undefined;
    };
  };
}

/**
 * Internal error factory options interface.
 * This interface defines the options that can be passed to the internal error factory.
 * It includes an optional error code, metadata, and a schema for additional arguments and instance types.
 */
interface InternalErrorFactoryOptions<A = never, I = never> {

  /**
   * An optional error code that identifies the specific internal error.
   * This code is used for logging and debugging purposes.
   * It should be one of the predefined internal error codes.
   * @see InternalErrorCode
   */
  code?: InternalErrorCode;

  /**
   * An optional metadata object that provides additional information about the internal error.
   * This can include details such as the error's context, severity, and any other relevant information.
   */
  metaData?: Partial<InternalErrorCodeMetadata>;

  /**
   * An optional schema that defines the structure of additional arguments and instance types for the internal error.
   * This can be used to validate and enforce the types of arguments passed to the error.
   */
  schema?: Schema.Schema<A, I>;
}

/**
 * The instance type of the internal error class that is created
 * using the internal error factory function.
 */
// export type InternalError<T extends string, A = never, I = never> = Brand.Branded<BaseInstance<T, A, I>, typeof INTERNAL_ERROR_MARKER>

function base<T extends string, A = never, I = never>(tag: T, factoryOptions: InternalErrorFactoryOptions<A, I>) {
  class Factory extends Data.Error {
    static get [INTERNAL_ERROR_MARKER]() { return INTERNAL_ERROR_MARKER }

    readonly _tag: T = tag
    readonly [KIND_MARKER]: typeof ErrorKind.INTERNAL = ErrorKind.INTERNAL

    get [Symbol.toStringTag]() { return this._tag }

    /**
     * Unique error code for the error to be used in the error tracking system
     * and for error categorization.
     *
     * @see {@link InternalErrorCode}
     */
    readonly code: InternalErrorCode

    /**
     * The metadata for the error code that provides additional information
     * about the internal error.
     *
     * @see {@link InternalErrorCodeMetadata} for more information on the metadata.
     */
    readonly metadata: InternalErrorCodeMetadata

    /**
     * A human-readable message that describes the error.
     */
    readonly message: string

    /**
     * The original error that caused this internal error to be thrown.
     *
     * This is useful for debugging and logging purposes to understand the
     * root cause of the error.
     *
     * @see {@link Exception} for more information on the exception class.
     */
    readonly cause?: Error | FrameworkException | InternalError<string, any, any>

    /**
     * The stack trace of the error that provides information about the
     * sequence of function calls that led to the error.
     *
     * It may be `undefined` if the stack trace is not available or
     * the cause is not an error.
     */
    readonly stack?: string

    /**
     * The internals of the internal error class that are used to
     * store the configuration and state of the error.
     */
    readonly [INTERNALS_MARKER]: InternalErrorInternals<A, I> = {
      schema: defaultTo(factoryOptions.schema, Schema.Never) as Schema.Schema<A, I>,
      context: {
        data: {
          encoded: undefined,
        },
      },
    }

    constructor(...args: InternalErrorConstructorParameters<I>) {
      super()

      /**
       * The constructor arguments for the internal error class.
       */
      interface InternalErrorConstructorArguments {
        contextOrMessage: string | { data: I } | undefined;
        messageOrOptions: string | InternalErrorOptions | undefined;
        options: InternalErrorOptions | undefined;
      }

      /**
       * Resolve the arguments to get the context, message, and options
       * for the internal error.
       */
      const resolvedArguments = Match.type<InternalErrorConstructorArguments>().pipe(
        Match
          .withReturnType<{
          context: { data: I | undefined };
          code: InternalErrorCode;
          metadata: InternalErrorCodeMetadata;
          cause: Error | FrameworkException | InternalError<string, any, any> | undefined;
        }>(),
        Match.when(
          ({ contextOrMessage }) => is.object(contextOrMessage),
          ({ contextOrMessage, messageOrOptions, options }) => {
            const code = defaultTo(
              defaultTo(options?.code, factoryOptions.code),
              InternalErrorCode.I_UNKNOWN,
            )
            return {
              code,
              cause: options?.cause,

              context: { data: (contextOrMessage as { data: I }).data },
              metadata: defu(
                {
                  message: messageOrOptions as string,
                } as InternalErrorCodeMetadata,
                factoryOptions.metaData,
                defaultTo(get(INTERNAL_ERROR_CODE_METADATA, code), INTERNAL_ERROR_CODE_METADATA[InternalErrorCode.I_UNKNOWN]),
              ),
            }
          },
        ),
        Match.orElse(
          ({ contextOrMessage, messageOrOptions }) => {
            const code = defaultTo(
              defaultTo((messageOrOptions as InternalErrorOptions | undefined)?.code, factoryOptions.code),
              InternalErrorCode.I_UNKNOWN,
            )
            return {
              code,
              cause: (messageOrOptions as InternalErrorOptions | undefined)?.cause,
              context: { data: undefined },
              metadata: defu(
                {
                  message: contextOrMessage as string,
                } as InternalErrorCodeMetadata,
                factoryOptions.metaData,
                defaultTo(get(INTERNAL_ERROR_CODE_METADATA, code), INTERNAL_ERROR_CODE_METADATA[InternalErrorCode.I_UNKNOWN]),
              ),
            }
          },
        ),
      )({ contextOrMessage: args[0], messageOrOptions: args[1], options: args[2] })

      /**
       * Update the internals of the internal error class.
       */
      this[INTERNALS_MARKER].context.data.encoded = resolvedArguments.context.data

      /**
       * Set the default values for the error code, metadata, message and cause.
       */
      this.code = resolvedArguments.code
      this.metadata = resolvedArguments.metadata
      this.cause = resolvedArguments.cause
      this.message = resolvedArguments.metadata.message

      /**
       * Set the stack trace of the error if the cause is an error
       * and has a stack trace.
       */
      if (this.cause && has(this.cause, 'stack')) {
        this.stack = this.cause.stack
      }

      /**
       * Capture the error stack trace if stack trace is
       * not available and the cause is not an error.
       */
      if (is.nullOrUndefined(this.stack)) {
        Error.captureStackTrace(this, this.cause ?? Object.getPrototypeOf(this).constructor)
      }
    }

    /**
     * The string representation of the internal error instance
     * that includes the error code, message.
     */
    toString() {
      return `<${this._tag}> [${this.code}]: ${this.message}`
    }

    /**
     * The JSON representation of the internal error instance
     * that includes the error code, message, cause, and stack trace.
     */
    toJSON() {
      return {
        _tag: this._tag,
        _kind: this[KIND_MARKER],
        code: this.code,
        message: this.message,
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
     * Decodes the context data of the internal error instance
     * using the schema provided in the factory options.
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
     * Updates the encoded context data of the internal error instance
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
 * Base function to create an internal error.
 * This function is a template that can be used to create an internal error with a specific message and options.
 * It uses a template string to define the error message and can accept additional arguments and instance types.
 * @template T - The template string type for the error message.
 * @template A - The type of additional arguments that can be passed to the error.
 * @template I - The type of instance that can be created from the error.
 * @returns A function that takes a template string and returns an instance of the internal error.
 */
type BaseInstance<T extends string, A = never, I = never> = InstanceType<ReturnType<typeof base<T, A, I>>>

/**
 * Creates a new internal error class with the specified tag.
 * @param tag - The tag to associate with the internal error class.
 * @returns A function that takes factory options and returns the internal error class.
 */
export function InternalError<T extends string>(tag: T) {
  type RT = `@error/internal/${T}`
  const resolvedTag = `@error/internal/${tag}` as RT

  return <A = never, I = never>(factoryOptions: InternalErrorFactoryOptions<A, I>) => {
    class BaseInternalError extends base<RT, A, I>(resolvedTag, factoryOptions) {
      static make<E extends BaseInternalError>(this: new(...args: InternalErrorConstructorParameters<I>) => E, options: InternalErrorMakeOptions<I>) {
        if (has(options, 'context') && has(options.context, 'data')) {
          const args = [
            options.context,
            options.message,
            omit(options, 'context', 'message'),
          ] as unknown as InternalErrorConstructorParameters<I>
          return new this(...args)
        }
        const args = [options.message, omit(options, 'message')] as unknown as InternalErrorConstructorParameters<I>
        return new this(...args)
      }
    }
    ;(BaseInternalError.prototype as any).name = resolvedTag
    ; (BaseInternalError as any).tag = resolvedTag

    return BaseInternalError as unknown as (new (...args: InternalErrorConstructorParameters<I>) => Brand.Branded<InstanceType<typeof BaseInternalError>, typeof INTERNAL_ERROR_MARKER>) & { make: typeof BaseInternalError['make']; readonly [INTERNAL_ERROR_MARKER]: typeof INTERNAL_ERROR_MARKER }
  }
}

/**
 * The instance type of the internal error class that is created
 * using the internal error factory function.
 */
export type InternalError<T extends string, A = never, I = never> = Brand.Branded<BaseInstance<T, A, I>, typeof INTERNAL_ERROR_MARKER>

/**
 * The type of the internal error class that is created using
 * the internal error factory function.
 */
export type InternalErrorClass<T extends string, A = never, I = never>
  = & (new (...args: InternalErrorConstructorParameters<I>) => InternalError<T, A, I>)
    & { make: (options: InternalErrorMakeOptions<I>) => Brand.Brand.Unbranded<InternalError<T, A, I>>; readonly [INTERNAL_ERROR_MARKER]: typeof INTERNAL_ERROR_MARKER }

/**
 * Helper type to infer the schema type of the internal error class or instance.
 */
export type InferInternalErrorSchema<T extends InternalError<string, any, any> | InternalErrorClass<string, any, any>>
  = T extends InternalErrorClass<string, infer A, infer I>
    ? Schema.Schema<A, I>
    : T extends InternalError<string, infer A, infer I>
      ? Schema.Schema<A, I>
      : never
