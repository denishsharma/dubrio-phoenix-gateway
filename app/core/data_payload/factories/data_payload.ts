import type HttpContext from '#core/http/contexts/http_context'
import type HttpContextUnavailableError from '#core/http/errors/http_context_unavailable_error'
import type ValidationException from '#core/validation/exceptions/validation_exception'
import type { VineValidator } from '@vinejs/vine'
import type { Infer, SchemaTypes, ValidationOptions } from '@vinejs/vine/types'
import type { Brand, Tracer } from 'effect'
import type { Draft } from 'mutative'
import type { Jsonifiable } from 'type-fest'
import { DataSource } from '#constants/data_source'
import { INTERNALS_MARKER, KIND_MARKER } from '#constants/proto_marker'
import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DATA_PAYLOAD_MARKER } from '#core/data_payload/constants/data_payload_marker'
import DataPayloadInvalidDataSourceError from '#core/data_payload/errors/data_payload_invalid_data_source_error'
import DataPayloadKindMismatchError from '#core/data_payload/errors/data_payload_kind_mismatch_error'
import DataPayloadNotValidatedError from '#core/data_payload/errors/data_payload_not_validated_error'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import UnknownError from '#core/error/errors/unknown_error'
import HttpRequestService from '#core/http/services/http_request_service'
import JsonService from '#core/json/services/json_service'
import SchemaError from '#core/schema/errors/schema_error'
import VineValidationService from '#core/validation/services/vine_validation_service'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Effect, Inspectable, Option, pipe, Ref, Schema } from 'effect'
import { defaultTo, omit } from 'lodash-es'
import { create } from 'mutative'

/**
 * Forbidden keys that are not allowed to be used in the data payload class.
 * These keys are used by the data payload class to store
 * the configuration and state of the data payload.
 *
 * These keys are used to prevent the user from
 * accidentally overwriting the internal state of the data payload class.
 */
type ForbiddenKeys = 'process' | 'payload' | 'update' | 'toString' | 'toJSON' | 'toInspectable'

/**
 * The options for customizing the data payload process
 * that is used to process the data payload.
 */
type DataPayloadProcessOptions<K extends DataPayloadKind, M extends undefined | Record<string, any>>
  = & { kind: K }
    & (K extends typeof DataPayloadKind.REQUEST
      ? [undefined] extends M
          ? { validatorOptions?: ValidationOptions<M> | undefined }
          : { validatorOptions: ValidationOptions<M> }
      : object)

/**
 * The type of the data source that is accepted by the data payload processor.
 */
type ProcessDataSource<K extends DataPayloadKind, S extends SchemaTypes, I> = DataSource<K extends typeof DataPayloadKind.REQUEST ? Infer<S> : I>

/**
 * The internals of the data payload class that are used to
 * store the configuration and state of the data payload.
 */
interface DataPayloadInternals<
  A extends (object),
  I,
  S extends SchemaTypes,
  M extends undefined | Record<string, any>,
  R,
  EM,
  RM,
> {
  /**
   * Schema used to validate the data payload
   * and ensure it conforms to the expected structure.
   */
  schema: Schema.Schema<A, I, R>;

  /**
   * The Vine validator used to validate the data payload with the
   * request data and ensure it conforms to the expected structure
   * from the request.
   *
   * Only required when the kind is `DataPayloadKind.REQUEST`.
   */
  validator?: VineValidator<S, M>;

  /**
   * The function used to map the validated request data conforms to
   * the encoded schema structure for the schema validation.
   *
   * Only required when the kind is `DataPayloadKind.REQUEST`.
   */
  mapToSchema?: (data: Infer<S>) => Effect.Effect<I, EM, RM>;

  /**
   * The current state of the data payload.
   */
  data: {
    /**
     * The validated request data after the payload
     * has been validated via the validator as well as schema.
     */
    validated: Option.Option<A>;
  };
}

/**
 * The options for customizing the data payload factory function
 * that is used to create the data payload class.
 */
type DataPayloadFactoryOptions<
  K extends DataPayloadKind,
  A extends (object),
  I,
  S extends SchemaTypes,
  M extends undefined | Record<string, any>,
  R,
  EM,
  RM,
>
  = & {
    /**
     * The kind of data payload that is being created.
     *
     * This determines the type of data payload and how it will be
     * validated.
     *
     * @see {@link DataPayloadKind} for more information.
     */
    kind: K;

    /**
     * The schema used to validate the data payload
     * and ensure it conforms to the expected structure.
     *
     * @see {@link https://effect.website/docs/schema/introduction/} for more information.
     */
    schema: Schema.Schema<A, I, R>;
  }
  & (K extends typeof DataPayloadKind.REQUEST
    ? {
        /**
         * The Vine validator used to validate the data payload with the
         * request data and ensure it conforms to the expected structure
         * from the request.
         *
         * This is only required when the kind is `DataPayloadKind.REQUEST`.
         *
         * @see {@link https://vinejs.dev/docs/introduction} for more information.
         */
        validator: VineValidator<S, M>;

        /**
         * The function used to map the validated request data conforms to
         * the encoded schema structure for the schema validation.
         *
         * This is only required when the kind is `DataPayloadKind.REQUEST`.
         *
         * @param data - The validated request data.
         */
        mapToSchema?: (data: Infer<S>) => Effect.Effect<I, EM, RM>;
      }
    : object)

/**
 * Base factory function for creating data payload classes that can be used to
 * process and validate data payloads.
 */
function base<
  T extends string,
  K extends DataPayloadKind,
  A extends (object),
  I,
  S extends SchemaTypes,
  M extends undefined | Record<string, any>,
  R,
  EM,
  RM,
>(tag: T, factoryOptions: DataPayloadFactoryOptions<K, A, I, S, M, R, EM, RM>) {
  class Factory {
    static get [DATA_PAYLOAD_MARKER]() { return DATA_PAYLOAD_MARKER }

    readonly _tag: T = tag
    readonly [KIND_MARKER]: K = factoryOptions.kind

    get [Symbol.toStringTag]() { return this._tag }

    /**
     * The internals of the data payload class that are used to
     * store the configuration and state of the data payload.
     */
    readonly [INTERNALS_MARKER]: DataPayloadInternals<A, I, S, M, R, EM, RM> = {
      schema: factoryOptions.schema,
      validator: (factoryOptions as DataPayloadFactoryOptions<typeof DataPayloadKind.REQUEST, A, I, S, M, R, EM, RM>).validator,
      mapToSchema: (factoryOptions as DataPayloadFactoryOptions<typeof DataPayloadKind.REQUEST, A, I, S, M, R, EM, RM>).mapToSchema,
      data: {
        validated: Option.none(),
      },
    }

    /**
     * Process the data payload with the given options and data source,
     * and return the processed data payload.
     *
     * The validated data can be accessed via the `payload` method.
     *
     * @param options - The options used to process the data payload.
     */
    process(options: DataPayloadProcessOptions<K, M>) {
      /**
       * @param source - The data source that is used to process the data payload.
       *
       * @template L - Represents the return type of the data payload processor.
       */
      return <L = never>(source: ProcessDataSource<K, S, I>) =>
        Effect.gen(this, function* () {
          const typedEffect = yield* TypedEffectService
          const vineValidation = yield* VineValidationService

          return yield* Effect.gen(this, function* () {
            if (this[KIND_MARKER] !== options.kind) {
              return yield* new DataPayloadKindMismatchError({ data: { expected: this[KIND_MARKER], actual: options.kind } })
            }

            /**
             * Extract the data from the data source.
             */
            const sourceData = yield* pipe(
              DataSource.$match(source, {
                known: ({ source: data }) => data,
                unknown: ({ source: data }) => data,
              }),
              Effect.catchTag('NoSuchElementException', () => new DataPayloadInvalidDataSourceError()),
            )

            /**
             * Store the data in a reference so that it can be
             * accessed later.
             */
            const dataRef = yield* Ref.make<unknown>(sourceData)

            if (this[KIND_MARKER] === DataPayloadKind.REQUEST) {
              const validator = this[INTERNALS_MARKER].validator
              if (!validator) {
                return yield* new UnknownError(`[${this._tag}] This should never happen, the validator should always be defined for request data payloads with the kind set to 'DataPayloadKind.REQUEST'`)
              }

              const validated = yield* Effect.suspend(() => Effect.gen(function* () {
                const data = yield* dataRef.get
                return yield* vineValidation.validate(
                  validator!,
                  {
                    validator: (options as DataPayloadProcessOptions<typeof DataPayloadKind.REQUEST, M>).validatorOptions as any,
                    exception: {
                      validation: 'Validation error while validation the request data payload.',
                      unknown: 'Unknown error while validation the request data payload.',
                    },
                  },
                )(data)
              }))

              const mapToSchema = defaultTo(this[INTERNALS_MARKER].mapToSchema, (data: Infer<S>) => Effect.succeed(data))
              const mapped = yield* mapToSchema(validated)

              yield* Ref.set(dataRef, mapped)
            }

            return yield* Effect.suspend(() =>
              Effect.gen(this, function* () {
                const data = yield* dataRef.get
                return yield* Schema.decodeUnknown(this[INTERNALS_MARKER].schema, { errors: 'all' })(data).pipe(
                  SchemaError.fromParseError(`Unexpected error while decoding the data payload with tag ${this._tag}.`),
                )
              }),
            )
          }).pipe(
            Effect.map((data) => {
              /**
               * Store the validated data in the data payload
               * so that it can be accessed later.
               */
              this[INTERNALS_MARKER].data.validated = Option.some(data)

              /**
               * Assign the data to the data payload so that it can be
               * accessed later via direct property access.
               */
              Object.assign(this, data)
              return this
            }),

            typedEffect.overrideSuccessType<[L] extends [never] ? A : L>(),
            typedEffect.overrideErrorType<
              | (UnknownError | SchemaError | DataPayloadInvalidDataSourceError | DataPayloadKindMismatchError)
              | (K extends typeof DataPayloadKind.REQUEST ? (ValidationException | EM) : never)
            >(),
            typedEffect.overrideContextType<R | (K extends typeof DataPayloadKind.REQUEST
              ? Exclude<RM, Tracer.ParentSpan> | Exclude<Exclude<RM, Tracer.ParentSpan>, Tracer.ParentSpan>
              : never
            )>(),
          )
        })
    }

    /**
     * Returns the validated data payload.
     *
     * Can only be used after the data payload has been processed.
     * If the data payload has not been validated, it will throw an error.
     */
    get payload(): Effect.Effect<A, DataPayloadNotValidatedError, never> {
      return Effect.gen(this, function* () {
        if (Option.isNone(this[INTERNALS_MARKER].data.validated)) {
          return yield* new DataPayloadNotValidatedError({ data: { payload: this._tag } })
        }
        return this[INTERNALS_MARKER].data.validated.value
      })
    }

    /**
     * Updates the validated data payload with the given updater function.
     *
     * This will mutate the data payload and update the validated data in the
     * same instance of the data payload.
     *
     * @param updater - The function used to update the validated data payload.
     */
    update<L extends A>(updater: (draft: Draft<{ data: L }>) => void) {
      return Effect.gen(this, function* () {
        const data = yield* this.payload
        const updated = create({ data }, draft => updater(draft as Draft<{ data: L }>))
        this[INTERNALS_MARKER].data.validated = Option.some(updated.data)
        Object.assign(this, updated.data)
      })
    }

    /**
     * Returns the string representation of the validated data payload.
     */
    toString() {
      return Effect.runSync(Effect.gen(this, function* () {
        const json = yield* JsonService
        return yield* json.stringify(2)(this.toJSON() as Jsonifiable)
      }).pipe(Effect.provide(JsonService.Default)))
    }

    /**
     * Returns the JSON representation of the data payload,
     * if the data payload is not valid, it will return `null`.
     */
    toJSON() {
      return Option.getOrNull(this[INTERNALS_MARKER].data.validated)
    }

    /**
     * Returns the JSON representation of the data payload
     * with the internals of the data payload.
     */
    toInspectable() {
      return Inspectable.toJSON(
        {
          _tag: this._tag,
          _king: this[KIND_MARKER],
          _internals: omit(this[INTERNALS_MARKER], 'data'),
          data: this.toJSON(),
        },
      )
    }
  }
  ;(Factory.prototype as any).name = tag
  return Factory
}

/**
 * Instance type of the base data payload class that is created
 * using the `base` factory function.
 */
type BaseInstance<
  T extends string,
  K extends DataPayloadKind,
  A extends (object),
  I,
  S extends SchemaTypes,
  M extends undefined | Record<string, any>,
  R,
  EM,
  RM,
> = InstanceType<ReturnType<typeof base<T, K, A, I, S, M, R, EM, RM>>>

/**
 * Options for the `fromSource` and `fromRequest` methods of the data payload class.
 */
type FromOptions<K extends DataPayloadKind, M extends undefined | Record<string, any>>
  = K extends typeof DataPayloadKind.REQUEST
    ? [undefined] extends M
        ? { validatorOptions?: ValidationOptions<M> | undefined }
        : { validatorOptions: ValidationOptions<M> }
    : void

/**
 * Data payload class that is used to process and validate data payloads.
 *
 * Factory function for creating a data payload class with the unique tag
 * and the options provided to the factory function.
 *
 * Tag is prefixed with `@data_payload/` to ensure uniqueness and to
 * avoid conflicts with other tags in the application.
 */
export function DataPayload<T extends string>(tag: T) {
  type RT = `@data_payload/${T}`
  const resolvedTag = `@data_payload/${tag}` as RT

  return <
    K extends DataPayloadKind,
    A extends (object & ((keyof A & ForbiddenKeys) extends never ? object : never)),
    I extends object,
    S extends SchemaTypes,
    M extends undefined | Record<string, any>,
    R = never,
    EM = never,
    RM = never,
  >(factoryOptions: DataPayloadFactoryOptions<K, A, I, S, M, R, EM, RM>) => {
    class BaseDataPayload extends base<RT, K, A, I, S, M, R, EM, RM>(resolvedTag, factoryOptions) {
      /**
       * Process the data payload with the given options and data source,
       * and return the processed data payload.
       *
       * The validated data can be accessed via the `payload` method or
       * directly access the properties of the data payload.
       *
       * @param options - The options used to process the data payload.
       */
      static fromSource<V extends BaseDataPayload>(this: new() => V, options?: FromOptions<K, M>) {
        /**
         * @param source - The data source that is used to process the data payload.
         */
        return (source: ProcessDataSource<K, S, I>) => {
          const processOptions: DataPayloadProcessOptions<K, M> = {
            kind: factoryOptions.kind,
            ...(defu(is.object(options) ? options : {}, { validatorOptions: undefined }) as any),
          }

          return new this().process(processOptions)<ProcessedDataPayload<Brand.Branded<V, typeof DATA_PAYLOAD_MARKER>>>(source)
        }
      }

      /**
       * Process the data payload from the request with the given options.
       *
       * This will validate the request data and ensure it conforms to the expected structure
       * and return the processed data payload.
       *
       * The validated data can be accessed via the `payload` method or
       * directly access the properties of the data payload.
       *
       * @param options - The options used to process the data payload.
       */
      static fromRequest<V extends BaseDataPayload>(this: new() => V, options?: FromOptions<K, M>) {
        return Effect.gen(this, function* () {
          return yield* Effect.gen(this, function* () {
            const request = yield* HttpRequestService
            const requestData = yield* request.getRequestData.pipe(
              Effect.map(Option.getOrNull),
            )

            const processOptions: DataPayloadProcessOptions<K, M> = {
              kind: factoryOptions.kind,
              ...(defu(is.object(options) ? options : {}, { validatorOptions: undefined }) as any),
            }

            return yield* new this().process(processOptions)<ProcessedDataPayload<Brand.Branded<V, typeof DATA_PAYLOAD_MARKER>>>(DataSource.unknown(requestData))
          })
        })
      }
    }
    ;(BaseDataPayload.prototype as any).name = resolvedTag
    ;(BaseDataPayload as any).__tag__ = resolvedTag

    return BaseDataPayload as unknown as
      & (new() => Brand.Branded<InstanceType<typeof BaseDataPayload>, typeof DATA_PAYLOAD_MARKER>)
      & { readonly fromSource: typeof BaseDataPayload['fromSource']; readonly [DATA_PAYLOAD_MARKER]: typeof DATA_PAYLOAD_MARKER }
      & (K extends typeof DataPayloadKind.REQUEST ? { readonly fromRequest: typeof BaseDataPayload['fromRequest'] } : object)
  }
}

/**
 * The instance type of the data payload class that is created
 * using the data payload factory function.
 */
export type DataPayload<
  T extends string,
  K extends DataPayloadKind,
  A extends object,
  I,
  S extends SchemaTypes,
  M extends undefined | Record<string, any>,
  R,
  EM,
  RM,
> = Brand.Branded<BaseInstance<T, K, A, I, S, M, R, EM, RM>, typeof DATA_PAYLOAD_MARKER>

/**
 * The type of the data payload class that is created
 * using the data payload factory function.
 */
export type DataPayloadClass<
  T extends string,
  K extends DataPayloadKind,
  A extends object,
  I,
  S extends SchemaTypes,
  M extends undefined | Record<string, any>,
  R,
  EM,
  RM,
> = (new () => DataPayload<T, K, A, I, S, M, R, EM, RM>)
  & {
    readonly fromSource: (source: ProcessDataSource<K, S, I>) => Effect.Effect<A, DataPayloadKindMismatchError | UnknownError | DataPayloadInvalidDataSourceError | SchemaError | ValidationException, TypedEffectService | VineValidationService>;
    readonly [DATA_PAYLOAD_MARKER]: typeof DATA_PAYLOAD_MARKER;
  }
  & (K extends typeof DataPayloadKind.REQUEST
    ? { readonly fromRequest: () => Effect.Effect<A, HttpContextUnavailableError | DataPayloadKindMismatchError | UnknownError | DataPayloadInvalidDataSourceError | SchemaError | ValidationException, HttpRequestService | VineValidationService | HttpContext | TypedEffectService> }
    : object
  )

/**
 * Internal type of the processed data payload that is used to
 * store the processed data payload.
 */
type IProcessedDataPayload<P, A extends object> = Brand.Branded<Brand.Brand.Unbranded<Omit<P, 'process' | 'payload'>> & A & { readonly payload: Effect.Effect<A, never, never> }, typeof DATA_PAYLOAD_MARKER>

/**
 * The type of the processed data payload that is returned
 * from the data payload processor.
 *
 * This is used to ensure that the processed data payload
 * conforms to the expected structure and can be used
 * to access the validated data payload.
 */
export type ProcessedDataPayload<P extends DataPayload<any, any, any, any, any, any, any, any, any> | DataPayloadClass<any, any, any, any, any, any, any, any, any>>
  = P extends DataPayload<any, any, infer A, any, any, any, any, any, any>
    ? IProcessedDataPayload<P, A>
    : P extends DataPayloadClass<any, any, infer A, any, any, any, any, any, any>
      ? IProcessedDataPayload<P, A>
      : never

/**
 * Helper type to infer the data payload schema from the
 * data payload class or data payload instance.
 *
 * This will infer the schema used to validate the data payload
 * and ensure it conforms to the expected structure.
 */
export type InferDataPayloadSchema<P extends DataPayload<any, any, any, any, any, any, any, any, any> | DataPayloadClass<any, any, any, any, any, any, any, any, any>>
  = P extends DataPayload<any, any, infer A, infer I, any, any, infer R, any, any>
    ? Schema.Schema<A, I, R>
    : P extends DataPayloadClass<any, any, infer A, infer I, any, infer R, any, any, any>
      ? Schema.Schema<A, I, R>
      : never
