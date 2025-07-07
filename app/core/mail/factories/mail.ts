import type HttpContext from '#core/http/contexts/http_context'
import type { UndefinedSchema } from '#core/schema/types/schema'
import type { Message } from '@adonisjs/mail'
import type { Brand } from 'effect'
import { INTERNALS_MARKER } from '#constants/proto_marker'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import { MAIL_MARKER } from '#core/mail/constants/mail_marker'
import SchemaError from '#core/schema/errors/schema_error'
import { BaseMail } from '@adonisjs/mail'
import { Effect, Inspectable, Option, pipe, Schema } from 'effect'
import { defaultTo } from 'lodash-es'

/**
 * Context for the mail class.
 */
interface MailContext {
  message: Message;
}

/**
 * Type for the prepare function that is used to prepare the mail for sending.
 * It takes a context and an optional payload, and returns an effect that prepares the mail.
 */
type PrepareFunction<S extends Schema.Schema.AnyNoContext | undefined, E, R> = (
  ...args: S extends undefined
    ? [context: MailContext]
    : [context: MailContext, payload: Schema.Schema.Type<S>]
) => Effect.Effect<void, E, Exclude<R, HttpContext>>

/**
 * Type for the constructor parameters of the mail class.
 * If the schema is undefined, the payload is assumed to be void.
 * If a schema is provided, the payload is encoded according to that schema.
 */
export type MailConstructorParameters<S extends Schema.Schema.AnyNoContext | undefined> = S extends undefined
  ? [payload: void]
  : [payload: Schema.Schema.Encoded<S>]

/**
 * The internals of the mail class that are used to
 * store the configuration and state of the mail.
 */
interface MailInternals<S extends Schema.Schema.AnyNoContext | undefined> {
  schema: Exclude<S, undefined>;
  context: MailContext;
  payload: {
    encoded: Option.Option<Schema.Schema.Encoded<Exclude<S, undefined>>>;
    decoded: Option.Option<Schema.Schema.Type<Exclude<S, undefined>>>;
  };
}

/**
 * Options for the mail factory function.
 */
interface MailFactoryOptions<S extends Schema.Schema.AnyNoContext | undefined, E, R> {
  /**
   * The schema used to validate the payload of the mail.
   * If no schema is provided, the payload is assumed to be undefined.
   */
  schema?: S;

  /**
   * The function that prepares the mail for sending.
   * This function is called with the context and the decoded payload.
   */
  prepare: PrepareFunction<S, E, R>;
}

/**
 * Base factory function for creating mail classes that can be used to
 * send emails with a specific tag and configuration.
 */
function base<T extends string, S extends Schema.Schema.AnyNoContext | undefined, E, R>(tag: T, factoryOption: MailFactoryOptions<S, E, R>) {
  class Factory extends BaseMail {
    static get [MAIL_MARKER]() { return MAIL_MARKER }

    readonly _tag: T = tag
    get [Symbol.toStringTag]() { return this._tag }

    /**
     * The internals of the mail class that are used to
     * store the configuration and state of the mail.
     */
    readonly [INTERNALS_MARKER]: MailInternals<S> = {
      schema: defaultTo(factoryOption.schema, Schema.Never) as Exclude<S, undefined>,
      context: {
        message: this.message,
      },
      payload: {
        encoded: Option.none(),
        decoded: Option.none(),
      },
    }

    constructor(...args: MailConstructorParameters<S>) {
      super()

      /**
       * If the schema is undefined, we assume no payload is provided.
       * If a payload is provided, we store it in the internals.
       */
      const [payload] = args
      this[INTERNALS_MARKER].payload.encoded = Option.some(payload)
    }

    /**
     * Prepares the mail for sending.
     * This method decodes the payload using the provided schema and calls the prepare function.
     */
    async prepare() {
      return await Effect.gen(this, function* () {
        const typedEffect = yield* TypedEffectService

        return yield* Effect.gen(this, function* () {
          const payload = yield* pipe(
            Option.getOrUndefined(this[INTERNALS_MARKER].payload.encoded),
            Schema.decode(Schema.UndefinedOr(this[INTERNALS_MARKER].schema), { errors: 'all' }),
            SchemaError.fromParseError(`Unexpected error occurred while decoding mail payload for '${this._tag}'.`),
            typedEffect.overrideContextType<never>(),
          )

          const args = [this[INTERNALS_MARKER].context, payload] as Parameters<PrepareFunction<S, E, R>>
          yield* factoryOption.prepare(...args)
        }).pipe(
          typedEffect.overrideContextType<never>(),
        )
      }).pipe(ApplicationRuntimeExecution.runPromise())
    }

    /**
     * Returns a string representation of the mail object.
     */
    toString() {
      return `Mail<${this._tag}>`
    }

    /**
     * Returns a JSON representation of the mail object.
     * This is useful for logging or debugging purposes.
     */
    toJSON() {
      return Inspectable.toJSON({
        _tag: this._tag,
        payload: this[INTERNALS_MARKER].payload,
      })
    }

    /**
     * Returns an inspectable representation of the mail object.
     * This is useful for debugging and provides a structured view of the mail's internals.
     */
    toInspectable() {
      return Inspectable.toJSON(
        {
          _tag: this._tag,
          payload: this[INTERNALS_MARKER].payload,
          context: this[INTERNALS_MARKER].context,
        },
      )
    }
  }
  ;(Factory.prototype as any).name = tag
  return Factory
}

/**
 * Instance type of the base mail class that is created using the
 * `base` factory function.
 */
type BaseInstance<T extends string, S extends Schema.Schema.AnyNoContext | undefined, E, R> = InstanceType<ReturnType<typeof base<T, S, E, R>>>

/**
 * Mail class that is used to create mail instances with a specific tag.
 *
 * Tag is prefixed with `@mail/` to ensure uniqueness and avoid conflicts
 * with other tags in the application.
 */
export function Mail<T extends string>(tag: T) {
  type RT = `@mail/${T}`
  const resolvedTag = `@mail/${tag}` as RT

  return <S extends Schema.Schema.AnyNoContext | undefined = undefined, E = never, R = never>(factoryOption: MailFactoryOptions<S, E, R>) => {
    class Base extends base<RT, S, E, R>(resolvedTag, factoryOption) {}
    ;(Base.prototype as any).name = resolvedTag
    ;(Base as any).__tag__ = resolvedTag

    return Base as unknown as
      & (new (...args: MailConstructorParameters<S>) => Brand.Branded<InstanceType<typeof Base>, typeof MAIL_MARKER>)
      & { readonly [MAIL_MARKER]: typeof MAIL_MARKER }
  }
}

/**
 * The instance type of the mail class that is created
 * using the mail factory function.
 */
export type Mail<T extends string, S extends Schema.Schema.AnyNoContext | undefined, E, R> = Brand.Branded<BaseInstance<T, S, E, R>, typeof MAIL_MARKER>

/**
 * Type type of the mail class that is created using the
 * mail factory function.
 */
export type MailClass<T extends string, S extends Schema.Schema.AnyNoContext | undefined, E, R>
  = & (new (...args: MailConstructorParameters<S>) => Mail<T, S, E, R>)
    & { readonly [MAIL_MARKER]: typeof MAIL_MARKER }

/**
 * Helper type to infer the payload schema from a mail class or instance.
 */
export type InferMailPayloadSchema<M extends Mail<any, any, any, any> | MailClass<any, any, any, any>>
  = M extends Mail<any, infer S, any, any>
    ? S extends undefined
      ? UndefinedSchema
      : S
    : M extends MailClass<any, infer S, any, any>
      ? S extends undefined
        ? UndefinedSchema
        : S
      : never
