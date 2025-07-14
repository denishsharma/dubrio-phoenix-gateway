import type { Brand } from 'effect'
import type { Spread } from 'type-fest'
import { INTERNALS_MARKER, KIND_MARKER, TAG_MARKER } from '#constants/proto_marker'
import UnknownError from '#core/error/errors/unknown_error'
import { SCHEMA_ATTRIBUTE_MARKER } from '#core/schema/constants/schema_marker'
import SchemaError from '#core/schema/errors/schema_error'
import NoSuchElementError from '#errors/no_such_element_error'
import is from '@adonisjs/core/helpers/is'
import { Effect, Inspectable, Option, pipe, Schema } from 'effect'
import { has } from 'lodash-es'

/**
 * The internals for the schema attribute class.
 */
interface SchemaAttributeInternals<A, I, R, M extends string | symbol> {
  schema: Schema.Schema<A, I, R>;
  marker: M;
  data: {
    encoded: Option.Option<Schema.Schema.Encoded<Schema.Schema<A, I, R>>>;
    decoded: Option.Option<Schema.Schema.Type<Schema.Schema<A, I, R>>>;
  };
}

/**
 * The options for the schema attribute factory function.
 */
interface SchemaAttributeFactoryOptions<A, I, R, M extends string | symbol> {
  /**
   * The marker to identify the schema attribute.
   * This is used to distinguish schema attributes from other schema attributes.
   */
  readonly schema: Schema.Schema<A, I, R>;

  /**
   * Schema that defines the data structure of the schema attribute.
   * This is used to encode/decode the schema attribute.
   */
  readonly marker: M;
}

/**
 * The base factory function for creating schema attribute class
 * which can be used to create schema attributes with a specific tag and schema.
 */
function base<T extends string, A, I, R, M extends string | symbol>(tag: T, factoryOptions: SchemaAttributeFactoryOptions<A, I, R, M>) {
  class Factory {
    readonly _tag: T = tag
    readonly [SCHEMA_ATTRIBUTE_MARKER] = SCHEMA_ATTRIBUTE_MARKER

    get [Symbol.toStringTag]() { return this._tag }

    /**
     * This marker is used to identify the class as a schema attribute.
     * This is used to distinguish schema attributes from other schema attributes.
     */
    readonly [KIND_MARKER]: M = factoryOptions.marker

    /**
     * The internals to store the configuration and state of the schema attribute.
     */
    readonly [INTERNALS_MARKER]: SchemaAttributeInternals<A, I, R, M> = {
      marker: factoryOptions.marker,
      schema: factoryOptions.schema,
      data: {
        encoded: Option.none(),
        decoded: Option.none(),
      },
    }

    constructor(encoded: Option.Option<I>, decoded: Option.Option<A>) {
      this[INTERNALS_MARKER].data.encoded = encoded
      this[INTERNALS_MARKER].data.decoded = decoded

      /**
       * This is a proxy to allow access to the value of the schema attribute.
       * It allows to access the value of the schema attribute using the `value` property.
       *
       * This is useful to avoid having to decode the schema attribute every time we want to access its value.
       * It also allows to access the value of the schema attribute without having to check if it
       * has been decoded or not.
       */
      return new Proxy(this, {
        get: (target, prop, receiver) => {
          if (prop === 'value') {
            const data = this[INTERNALS_MARKER].data.decoded
            if (Option.isSome(data)) { return data.value }

            throw new UnknownError(`Cannot access 'value' property of schema attribute '${this._tag}' because it has not been decoded yet.`)
          }

          return Reflect.get(target, prop, receiver)
        },
      })
    }

    /**
     * Returns the encoded value of the schema attribute.
     */
    get encoded() {
      const data = this[INTERNALS_MARKER].data.decoded
      const schema = this[INTERNALS_MARKER].schema
      const thisTag = this._tag

      return Effect.gen(this, function* () {
        return yield* pipe(
          data,
          Schema.encode(
            Schema.asSchema(
              Schema.OptionFromSelf(schema),
            ),
            { errors: 'all' },
          ),
          SchemaError.fromParseError(`Unexpected error occurred while encoding data for schema attribute with tag '${thisTag}'`),
          Effect.flatten,
          Effect.catchTag('NoSuchElementException', error => new NoSuchElementError(`Cannot access 'encoded' property of schema attribute '${thisTag}' because it has not been encoded yet.`, { cause: error })),
        )
      })
    }

    /**
     * Returns the string representation of the schema attribute.
     */
    toString() {
      return `SchemaAttribute<${this._tag}>`
    }

    /**
     * Returns the JSON representation of the schema attribute.
     * This is used to serialize the schema attribute to JSON.
     */
    toJSON() {
      const data = Option.getOrUndefined(this[INTERNALS_MARKER].data.encoded)
      return Inspectable.toJSON(data)
    }

    /**
     * Returns the inspectable representation of the schema attribute.
     * This is used to debug the schema attribute.
     */
    toInspectable() {
      return Inspectable.toJSON({
        _tag: this._tag,
        [KIND_MARKER]: this[KIND_MARKER],
        data: {
          encoded: Option.getOrUndefined(this[INTERNALS_MARKER].data.encoded),
          decoded: Option.getOrUndefined(this[INTERNALS_MARKER].data.decoded),
        },
      })
    }
  }
  ;(Factory.prototype as any).name = tag
  return Factory
}

/**
 * Base instance type for the schema attribute class.
 * This is used to ensure that the schema attribute class has the correct type.
 */
type BaseInstance<T extends string, A, I, R, M extends string | symbol> = Spread<InstanceType<ReturnType<typeof base<T, A, I, R, M>>>, { readonly value: A }>

/**
 * Factory function to create a schema attribute class with a specific tag
 * and factory options.
 *
 * Tag is prefixed with `@schema_attribute/` to ensure uniqueness
 * and to avoid conflicts with other schema attributes.
 *
 * @see {@link SchemaAttributeFactoryOptions} for the options that can be passed to the factory function.
 *
 * @param tag - The tag to identify the schema attribute.
 */
export function SchemaAttribute<T extends string>(tag: T) {
  type RT = `@schema_attribute/${T}`
  const resolvedTag = `@schema_attribute/${tag}` as RT

  /**
   * @param factoryOptions - The options for the schema attribute factory function.
   */
  return <A, I, R, M extends string | symbol>(factoryOptions: SchemaAttributeFactoryOptions<A, I, R, M>) => {
    class BaseSchemaAttribute extends base<RT, A, I, R, M>(resolvedTag, factoryOptions) {
      static get [KIND_MARKER]() { return factoryOptions.marker as M }
      static get [SCHEMA_ATTRIBUTE_MARKER]() { return SCHEMA_ATTRIBUTE_MARKER }
      static get [TAG_MARKER]() { return resolvedTag }

      static get schema() { return factoryOptions.schema }

      static make<V extends BaseSchemaAttribute>(this: new (encoded: Option.Option<I>, decoded: Option.Option<A>) => V, data: I) {
        return Effect.gen(this, function* () {
          const decoded = yield* pipe(
            data,
            Schema.decode(
              Schema.asSchema(factoryOptions.schema),
              { errors: 'all' },
            ),
            SchemaError.fromParseError(`Unexpected error occurred while decoding data for schema attribute with tag '${resolvedTag}'`),
            Effect.map(Option.some),
          )
          const encoded = Option.some(data)

          return new this(encoded, decoded)
        })
      }

      static is<V extends BaseSchemaAttribute>(this: new (encoded: Option.Option<I>, decoded: Option.Option<A>) => V, value: unknown): value is V {
        return is.object(value)
          && has(value, KIND_MARKER)
          && value[KIND_MARKER] === factoryOptions.marker
          && has(value, SCHEMA_ATTRIBUTE_MARKER)
          && value[SCHEMA_ATTRIBUTE_MARKER] === SCHEMA_ATTRIBUTE_MARKER
          && has(value, TAG_MARKER)
          && value[TAG_MARKER] === resolvedTag
      }
    }
    ;(BaseSchemaAttribute.prototype as any).name = resolvedTag

    return BaseSchemaAttribute as unknown as
      & (new (encoded: Option.Option<I>, decoded: Option.Option<A>) => Brand.Branded<Brand.Branded<Spread<InstanceType<typeof BaseSchemaAttribute>, { readonly value: A }>, M>, typeof SCHEMA_ATTRIBUTE_MARKER>)
      & {
        /**
         * The kind of the schema attribute.
         * This is used to distinguish schema attributes from other schema attributes.
         */
        readonly [KIND_MARKER]: M;

        /**
         * The marker used to identify the schema attribute.
         * This is used to distinguish schema attributes from other classes.
         */
        readonly [SCHEMA_ATTRIBUTE_MARKER]: typeof SCHEMA_ATTRIBUTE_MARKER;

        /**
         * The tag used to identify the schema attribute.
         * This is used to distinguish schema attributes from other schema attributes.
         */
        readonly [TAG_MARKER]: RT;

        /**
         * Returns the schema of the schema attribute.
         * This is used to get the schema of the schema attribute.
         */
        readonly schema: Schema.Schema<A, I, R>;

        /**
         * Creates a new instance of the schema attribute with the given data.
         */
        readonly make: typeof BaseSchemaAttribute.make;

        /**
         * Checks if the value is an instance of the schema attribute.
         * This is used to check if the value is an instance of the schema attribute.
         */
        readonly is: typeof BaseSchemaAttribute.is;
      }
  }
}

/**
 * The instance type for the schema attribute class that
 * is created by the `SchemaAttribute` factory function.
 */
export type SchemaAttribute<T extends string, A, I, R, M extends string | symbol> = Brand.Branded<Brand.Branded<BaseInstance<T, A, I, R, M>, M>, typeof SCHEMA_ATTRIBUTE_MARKER>

export type SchemaAttributeClass<T extends string, A, I, R, M extends string | symbol>
  = & (new (encoded: Option.Option<I>, decoded: Option.Option<A>) => SchemaAttribute<T, A, I, R, M>)
    & {
    /**
     * The kind of the schema attribute.
     * This is used to distinguish schema attributes from other schema attributes.
     */
      readonly [KIND_MARKER]: M;

      /**
       * The marker used to identify the schema attribute.
       * This is used to distinguish schema attributes from other classes.
       */
      readonly [SCHEMA_ATTRIBUTE_MARKER]: typeof SCHEMA_ATTRIBUTE_MARKER;

      /**
       * The tag used to identify the schema attribute.
       * This is used to distinguish schema attributes from other schema attributes.
       */
      readonly [TAG_MARKER]: T;

      /**
       * Returns the schema of the schema attribute.
       * This is used to get the schema of the schema attribute.
       */
      readonly schema: Schema.Schema<A, I, R>;

      /**
       * Creates a new instance of the schema attribute with the given data.
       */
      readonly make: (data: I) => Effect.Effect<unknown, SchemaError, R>;

      /**
       * Checks if the value is an instance of the schema attribute.
       * This is used to check if the value is an instance of the schema attribute.
       */
      readonly is: (value: unknown) => boolean;
    }
