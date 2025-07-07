import type { Brand } from 'effect'
import type { Spread } from 'type-fest'
import type { IsUnion } from 'type-fest/source/internal/index.js' // TODO: Remove this when `type-fest` is updated to a version that includes `IsUnion` directly.
import { INTERNALS_MARKER } from '#constants/proto_marker'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import UnknownError from '#core/error/errors/unknown_error'
import { LUCID_MODEL_IDENTIFIER_MARKER } from '#core/lucid/constants/lucid_marker'
import { LucidModelIdentifierSupport } from '#core/lucid/constants/lucid_model_identifier_support'
import SchemaError from '#core/schema/errors/schema_error'
import is from '@adonisjs/core/helpers/is'
import { Effect, Inspectable, Match, Option, pipe, Schema } from 'effect'
import { has } from 'lodash-es'

/**
 * Schema when the Lucid model identifier is only an ID (number).
 *
 * This is mostly used for models that do not use ULID as their unique identifier
 * and only rely on a numeric ID (e.g., auto-incrementing primary key).
 *
 * The column in the database is expected to be of name `id`.
 */
const ID_ONLY_SCHEMA = Schema.asSchema(Schema.transform(
  Schema.Int.pipe(Schema.positive()),
  Schema.Struct({
    key: Schema.Literal('id'),
    value: Schema.Number,
  }),
  {
    strict: true,
    decode: input => ({ key: 'id' as const, value: input }),
    encode: input => input.value,
  },
))

/**
 * Schema when the Lucid model identifier is only a ULID (as UID).
 *
 * This is used for models that use ULID as their unique identifier
 * and the identifier is expected to be in the format of a ULID.
 *
 * The column in the database is expected to be of name `uid`.
 */
const ULID_AS_UID_ONLY_SCHEMA = Schema.asSchema(Schema.transform(
  Schema.compose(Schema.NonEmptyTrimmedString, Schema.ULID),
  Schema.Struct({
    key: Schema.Literal('uid'),
    value: Schema.ULID,
  }),
  {
    strict: true,
    decode: input => ({ key: 'uid' as const, value: input }),
    encode: input => input.value,
  },
))

/**
 * Schema when the Lucid model identifier supports both ID and ULID.
 *
 * This is used for models that can be identified by either a numeric ID or a ULID.
 * The identifier can be either an integer (ID) or a ULID (as UID).
 *
 * The column in the database can be either `id` or `uid`, depending on the type of identifier used.
 */
const BOTH_SCHEMA = Schema.asSchema(Schema.transform(
  Schema.Union(
    Schema.Int.pipe(Schema.positive()),
    Schema.compose(Schema.NonEmptyTrimmedString, Schema.ULID),
  ),
  Schema.Union(
    Schema.Struct({
      key: Schema.Literal('id'),
      value: Schema.Number,
    }),
    Schema.Struct({
      key: Schema.Literal('uid'),
      value: Schema.ULID,
    }),
  ),
  {
    strict: true,
    decode: (input) => {
      if (typeof input === 'number') {
        return { key: 'id' as const, value: input }
      }
      return { key: 'uid' as const, value: input }
    },
    encode: input => input.value,
  },
))

/**
 * Helper type to infer the schema based on the identifier support type.
 * This is used to ensure that the correct schema is used based on the identifier support type.
 */
export type InferSchemaFromIdentifierSupport<K extends LucidModelIdentifierSupport>
  = K extends typeof LucidModelIdentifierSupport.INTEGER_ID_AS_ID
    ? typeof ID_ONLY_SCHEMA
    : K extends typeof LucidModelIdentifierSupport.ULID_AS_UID
      ? typeof ULID_AS_UID_ONLY_SCHEMA
      : K extends typeof LucidModelIdentifierSupport.BOTH
        ? typeof BOTH_SCHEMA
        : never

/**
 * Helper function to resolve the schema based on the identifier support type.
 */
function resolveSchemaFromIdentifierSupport<K extends LucidModelIdentifierSupport>(support: K) {
  return Match.value(support as LucidModelIdentifierSupport).pipe(
    Match.when(LucidModelIdentifierSupport.INTEGER_ID_AS_ID, () => ID_ONLY_SCHEMA),
    Match.when(LucidModelIdentifierSupport.ULID_AS_UID, () => ULID_AS_UID_ONLY_SCHEMA),
    Match.when(LucidModelIdentifierSupport.BOTH, () => BOTH_SCHEMA),
    Match.exhaustive,
  ) as InferSchemaFromIdentifierSupport<K>
}

/**
 * The parameters for the Lucid model identifier constructor.
 * This is used to ensure that the constructor accepts the correct type of value
 * based on the identifier support type.
 */
export type LucidModelIdentifierConstructorParameters<K extends LucidModelIdentifierSupport>
  = [InferSchemaFromIdentifierSupport<K>] extends [never]
    ? [value: void]
    : IsUnion<InferSchemaFromIdentifierSupport<K>> extends true
      ? [...value: any[]]
      : [value: Schema.Schema.Encoded<InferSchemaFromIdentifierSupport<K>>]

/**
 * The internals to store the lucid model identifier data.
 */
interface LucidModelIdentifierInternals<M extends string | symbol, T extends LucidModelIdentifierSupport> {
  marker: M;
  support: T;
  schema: InferSchemaFromIdentifierSupport<T>;
  data: {
    encoded: Option.Option<Schema.Schema.Encoded<InferSchemaFromIdentifierSupport<T>>>;
    decoded: Option.Option<Schema.Schema.Type<InferSchemaFromIdentifierSupport<T>>>;
  };
}

/**
 * The options for the Lucid model identifier factory.
 *
 * This includes the marker to identify the model identifier and the support type.
 */
interface LucidModelIdentifierFactoryOptions<M extends string | symbol, T extends LucidModelIdentifierSupport> {
  /**
   * The marker to identify the model identifier.
   * This is used to differentiate between different model identifiers.
   */
  readonly marker: M;

  /**
   * The support type for the model identifier.
   *
   * This indicates what kind of identifier support the model has,
   * such as ID only, ULID as UID only, or both.
   */
  readonly support: T;
}

/**
 * The base factory function to create a Lucid model identifier class
 * which can be extended to create specific model identifiers.
 */
function base<T extends string, M extends string | symbol, K extends LucidModelIdentifierSupport>(tag: T, factoryOption: LucidModelIdentifierFactoryOptions<M, K>) {
  class Factory {
    static get [LUCID_MODEL_IDENTIFIER_MARKER]() { return LUCID_MODEL_IDENTIFIER_MARKER }

    readonly _tag: T = tag
    readonly [LUCID_MODEL_IDENTIFIER_MARKER] = LUCID_MODEL_IDENTIFIER_MARKER

    get [Symbol.toStringTag]() { return this._tag }

    /**
     * The marker to identify the Lucid model identifier.
     * This is used to differentiate between different model identifiers.
     */
    readonly IDENTIFIER_MARKER: M = factoryOption.marker

    /**
     * The internals to store the Lucid model identifier data.
     */
    readonly [INTERNALS_MARKER]: LucidModelIdentifierInternals<M, K> = {
      marker: factoryOption.marker,
      support: factoryOption.support,
      schema: resolveSchemaFromIdentifierSupport<K>(factoryOption.support),
      data: {
        encoded: Option.none(),
        decoded: Option.none(),
      },
    }

    constructor(...args: LucidModelIdentifierConstructorParameters<K>) {
      const [value] = args

      return Effect.gen(this, function* () {
        if (is.undefined(value)) {
          this[INTERNALS_MARKER].data.encoded = Option.none()
        } else {
          this[INTERNALS_MARKER].data.encoded = Option.some(value as Schema.Schema.Encoded<InferSchemaFromIdentifierSupport<K>>)
        }

        yield* pipe(
          value,
          Schema.decode(
            this[INTERNALS_MARKER].schema as Schema.Schema.AnyNoContext,
            { errors: 'all' },
          ),
          SchemaError.fromParseError(`Unexpected error while decoding Lucid model identifier for '${tag}'.`, value),
          Effect.tap((data) => { this[INTERNALS_MARKER].data.decoded = Option.some(data) }),
        )

        return new Proxy(this, {
          get: (target, prop, receiver) => {
            if (prop === 'key' || prop === 'value') {
              const decoded = this[INTERNALS_MARKER].data.decoded
              if (Option.isSome(decoded)) { return decoded.value[prop as keyof typeof decoded.value] }

              throw new UnknownError(`Cannot access '${String(prop)}' on Lucid model identifier '${tag}' because it has not been decoded yet.`)
            }

            return Reflect.get(target, prop, receiver)
          },
        })
      }).pipe(ApplicationRuntimeExecution.runSync())
    }

    /**
     * Returns the string representation of the Lucid model identifier.
     */
    toString() {
      return `LucidModelIdentifier<${this._tag}>`
    }

    /**
     * Returns the JSON representation of the Lucid model identifier.
     * This is used to serialize the identifier to JSON format.
     */
    toJSON() {
      const data = Option.getOrElse(this[INTERNALS_MARKER].data.decoded, () => ({ key: null, value: null }))
      return Inspectable.toJSON({
        key: data.key,
        value: data.value,
      })
    }

    /**
     * Returns the essential information about the Lucid model identifier
     * in a format suitable for inspection.
     */
    toInspectable() {
      return Inspectable.toJSON({
        _tag: this._tag,
        IDENTIFIER_MARKER: this.IDENTIFIER_MARKER,
        data: Option.getOrElse(this[INTERNALS_MARKER].data.decoded, () => ({ key: null, value: null })),
      })
    }
  }
  ;(Factory.prototype as any).name = tag

  return Factory
}

/**
 * Base instance type for the Lucid model identifier.
 * This is used to ensure that the instance has the correct type and schema.
 */
type BaseInstance<T extends string, M extends string | symbol, K extends LucidModelIdentifierSupport> = Spread<InstanceType<ReturnType<typeof base<T, M, K>>>, Schema.Schema.Type<InferSchemaFromIdentifierSupport<K>>>

/**
 * Factory function for creating a Lucid model identifier class with
 * a specific tag and factory options.
 *
 * Tag is prefixed with `@lucid_model_identifier/` to ensure uniqueness
 * and to avoid conflicts with other identifiers.
 *
 * @see {@link LucidModelIdentifierFactoryOptions} for the options to create the identifier.
 *
 * @param tag - The tag to identify the model identifier.
 */
export function LucidModelIdentifier<T extends string>(tag: T) {
  type RT = `@lucid_model_identifier/${T}`
  const resolvedTag = `@lucid_model_identifier/${tag}` as RT

  /**
   * @param factoryOptions - The options to create the Lucid model identifier.
   */
  return <M extends string | symbol, K extends LucidModelIdentifierSupport>(factoryOptions: LucidModelIdentifierFactoryOptions<M, K>) => {
    class Identifier extends base<RT, M, K>(resolvedTag, factoryOptions) {
      static get IDENTIFIER_MARKER() { return factoryOptions.marker as M }

      static get _tag() { return resolvedTag }

      static get schema() {
        return resolveSchemaFromIdentifierSupport<K>(factoryOptions.support)
      }

      static make<V extends Identifier>(this: new (...args: LucidModelIdentifierConstructorParameters<K>) => V, ...args: LucidModelIdentifierConstructorParameters<K>) {
        return new this(...args)
      }

      static is<V extends Identifier>(this: new (...args: LucidModelIdentifierConstructorParameters<K>) => V, value: unknown): value is V {
        return is.object(value)
          && has(value, 'IDENTIFIER_MARKER')
          && value.IDENTIFIER_MARKER === factoryOptions.marker
          && has(value, LUCID_MODEL_IDENTIFIER_MARKER)
          && value[LUCID_MODEL_IDENTIFIER_MARKER] === LUCID_MODEL_IDENTIFIER_MARKER
      }
    }
    ;(Identifier.prototype as any).name = resolvedTag
    ;(Identifier as any).__tag__ = resolvedTag

    return Identifier as unknown as
      & (new (...args: LucidModelIdentifierConstructorParameters<K>) => Brand.Branded<Brand.Branded<Spread<InstanceType<typeof Identifier>, Schema.Schema.Type<InferSchemaFromIdentifierSupport<K>>>, M>, typeof LUCID_MODEL_IDENTIFIER_MARKER>)
      & {
        /**
         * The tag to identify the Lucid model identifier.
         * This is used to differentiate between different model identifiers.
         */
        readonly _tag: RT;

        /**
         * The schema for the Lucid model identifier.
         */
        readonly schema: InferSchemaFromIdentifierSupport<K>;

        /**
         * Creates a new instance of the Lucid model identifier
         * with the provided value.
         */
        readonly make: typeof Identifier['make'];

        /**
         * Checks if the value is a Lucid model identifier instance.
         * This is used to ensure that the value is of the correct type.
         */
        readonly is: typeof Identifier['is'];

        /**
         * The marker to identify the Lucid model identifier.
         * This is used to differentiate between different model identifiers.
         */
        readonly IDENTIFIER_MARKER: M;

        /**
         * The marker to identify the Lucid model identifier class.
         * This is used to ensure that the class is recognized as a Lucid model identifier.
         */
        readonly [LUCID_MODEL_IDENTIFIER_MARKER]: typeof LUCID_MODEL_IDENTIFIER_MARKER;
      }
  }
}

/**
 * The instance type for the Lucid model identifier class that
 * is created by the `LucidModelIdentifier` factory function.
 */
export type LucidModelIdentifier<T extends string, M extends string | symbol, K extends LucidModelIdentifierSupport> = Brand.Branded<Brand.Branded<BaseInstance<T, M, K>, M>, typeof LUCID_MODEL_IDENTIFIER_MARKER>

/**
 * The type of the Lucid model identifier class that is created
 * using the `LucidModelIdentifier` factory function.
 */
export type LucidModelIdentifierClass<T extends string, M extends string | symbol, K extends LucidModelIdentifierSupport>
  = & (new (...args: LucidModelIdentifierConstructorParameters<K>) => LucidModelIdentifier<T, M, K>)
    & {
      readonly _tag: T;
      readonly schema: InferSchemaFromIdentifierSupport<K>;
      readonly make: <V extends LucidModelIdentifier<T, M, K>>(...args: LucidModelIdentifierConstructorParameters<K>) => V;
      readonly is: <V extends LucidModelIdentifier<T, M, K>>(value: unknown) => value is V;
      readonly IDENTIFIER_MARKER: M;
      readonly [LUCID_MODEL_IDENTIFIER_MARKER]: typeof LUCID_MODEL_IDENTIFIER_MARKER;
    }
