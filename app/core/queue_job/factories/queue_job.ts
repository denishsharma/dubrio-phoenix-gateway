import type { R } from '#core/effect/types/application_runtime'
import type HttpContext from '#core/http/contexts/http_context'
import type { UndefinedSchema } from '#core/schema/types/schema'
import type queue from '@rlanz/bull-queue/services/main'
import type { Brand } from 'effect'
import type { Jsonifiable } from 'type-fest'
import { INTERNALS_MARKER } from '#constants/proto_marker'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import { QUEUE_JOB_MARKER } from '#core/queue_job/constants/queue_job_marker'
import QueueJobPayloadError from '#core/queue_job/errors/queue_job_payload_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import { Job } from '@rlanz/bull-queue'
import { defu } from 'defu'
import { Effect, Option, pipe, Schema } from 'effect'
import { defaultTo } from 'lodash-es'

/**
 * Helper function to create a schema for the job payload
 * with an `_id` and `_payload` property.
 *
 * @param schema - The schema for the job payload.
 */
export function withJobPayloadSchema<A, I>(schema?: Schema.Schema<A, I>) {
  return Schema.Struct({
    _id: Schema.String,
    _payload: Schema.Option(defaultTo(schema, Schema.Unknown) as Schema.Schema<A, I>),
  })
}

/**
 * Helper type that represents the options for dispatching a job to the queue.
 */
export type QueueOptions = Exclude<Parameters<typeof queue.dispatch>[2], undefined>

/**
 * Helper type that represents the parameters for the job handle function
 * based on the schema type.
 */
export type JobHandleFunctionParameters<
  S extends Schema.Schema<any, any> | undefined,
  A = S extends undefined ? never : Schema.Schema.Type<S>,
> = [A] extends [never]
  ? [id: string]
  : [payload: A, id: string]

/**
 * Helper type that represents the parameters for the job rescue function
 * based on the schema type.
 */
export type JobRescueFunctionParameters<
  S extends Schema.Schema<any, any> | undefined,
  A = S extends undefined ? never : Schema.Schema.Type<S>,
> = [A] extends [never]
  ? [id: string, error: Error]
  : [payload: A, id: string, error: Error]

/**
 * Helper type that represents inspectable properties of a queue job
 * for debugging and telemetry purposes.
 */
export interface QueueJobToInspectable<T extends string, S extends Schema.Schema<any, any> | undefined, E> {
  _tag: T;
  schema: S extends undefined ? typeof Schema.Unknown : S;
  handle: (...args: JobHandleFunctionParameters<S>) => Effect.Effect<void, E, Exclude<R, HttpContext>>;
  rescue: (...args: JobRescueFunctionParameters<S>) => Effect.Effect<void, never, Exclude<R, HttpContext>>;
}

/**
 * The internals of the queue job class to store the configuration
 * and state of the job.
 *
 * It also helps to infer the types of the job handle and rescue functions
 * based on the schema type.
 */
interface QueueJobInternals<S extends Schema.Schema<any, any> | undefined, E> {
  schema: S;
  handle: (...args: JobHandleFunctionParameters<S>) => Effect.Effect<void, E, Exclude<R, HttpContext>>;
  rescue: (...args: JobRescueFunctionParameters<S>) => Effect.Effect<void, never, Exclude<R, HttpContext>>;
}

/**
 * The options for creating a queue job class from a factory function.
 */
interface QueueJobFactoryOptions<S extends Schema.Schema<any, any> | undefined, E> {
  /**
   * Schema that describes the payload of the job to be processed
   * by the queue.
   *
   * This schema is used to validate and decode the payload
   * before processing it.
   *
   * Make sure that encoding and decoding the payload is JSON compatible
   * and can be serialized and deserialized correctly.
   */
  schema?: S & (S extends undefined ? unknown : (Schema.Schema.Type<S> extends Jsonifiable ? unknown : Schema.Schema.Encoded<S> extends Jsonifiable ? unknown : { __error__: 'Schema must be JSON serializable on encoding and decoding.' }));

  /**
   * The function that handles the job when it is processed by the queue.
   *
   * @param args - The arguments passed to the function depend on the schema type.
   */
  handle: (...args: JobHandleFunctionParameters<S>) => Effect.Effect<void, E, Exclude<R, HttpContext>>;

  /**
   * The function that handles the job when it fails to be processed by the queue.
   *
   * This function is called when the job fails and can be used to perform
   * any necessary cleanup or error handling.
   *
   * @param args - The arguments passed to the function depend on the schema type.
   */
  rescue?: (...args: JobRescueFunctionParameters<S>) => Effect.Effect<void, never, Exclude<R, HttpContext>>;

  /**
   * Additional default options for the queue job that can be overridden
   * when dispatching the job to the queue.
   */
  options?: QueueOptions;
}

/**
 * The base factory function for creating a queue job class with a specific tag
 * and provided factory options.
 *
 * It extends the `Job` class from the `@rlanz/bull-queue` package and adds
 * additional functionality for handling job payloads and telemetry.
 *
 * @see {@link Job} for more information on the base class.
 */
function base<T extends string, S extends Schema.Schema<any, any> | undefined, E>(tag: T, factoryOptions: QueueJobFactoryOptions<S, E>) {
  class Factory extends Job {
    static get [QUEUE_JOB_MARKER]() { return QUEUE_JOB_MARKER }

    readonly _tag: T = tag
    get [Symbol.toStringTag]() { return this._tag }

    /**
     * The internals of the queue job class to store the configuration
     * and state of the job.
     */
    readonly [INTERNALS_MARKER]: QueueJobInternals<S, E> = {
      schema: defaultTo(factoryOptions.schema, Schema.Unknown) as S,
      handle: factoryOptions.handle,
      rescue: defaultTo(factoryOptions.rescue, () => Effect.void),
    }

    /**
     * Handle function that is called when the job is processed by the queue.
     */
    async handle(payload: unknown): Promise<void> {
      await Effect.gen(this, function* () {
        const telemetry = yield* TelemetryService

        return yield* Effect.gen(this, function* () {
          const decodedPayload = yield* pipe(
            payload,
            Schema.decodeUnknown(withJobPayloadSchema(this[INTERNALS_MARKER].schema), { errors: 'all' }),
            QueueJobPayloadError.fromParseError(
              this._tag,
              'decode',
              `Unexpected error occurred while decoding payload for the job '${this._tag}'.`,
              payload,
            ),
          )

          return yield* Option.match(decodedPayload._payload, {
            onNone: () => (this[INTERNALS_MARKER].handle as (id: string) => Effect.Effect<void, any, any>)(decodedPayload._id),
            onSome: data => (this[INTERNALS_MARKER].handle as (payload: unknown, id: string) => Effect.Effect<void, any, any>)(data, decodedPayload._id),
          })
        }).pipe(
          Effect.asVoid,
          telemetry.withTelemetrySpan(`queue_job_handle<${this._tag}>`, {
            attributes: {
              queue_job_tag: this._tag,
            },
          }),
          telemetry.withScopedTelemetry('queue_job'),
        )
      }).pipe(ApplicationRuntimeExecution.runPromise())
    }

    /**
     * Rescue function that is called when the job fails to be processed by the queue.
     */
    async rescue(payload: unknown, error: Error): Promise<void> {
      await Effect.gen(this, function* () {
        const telemetry = yield* TelemetryService

        return yield* Effect.gen(this, function* () {
          const decodedPayload = yield* pipe(
            payload,
            Schema.decodeUnknown(withJobPayloadSchema(this[INTERNALS_MARKER].schema), { errors: 'all' }),
            QueueJobPayloadError.fromParseError(
              this._tag,
              'decode',
              `Unexpected error occurred while decoding payload for the job '${this._tag}'.`,
              payload,
            ),
          )

          return yield* Option.match(decodedPayload._payload, {
            onNone: () => (this[INTERNALS_MARKER].rescue as (id: string, error: Error) => Effect.Effect<void, never, any>)(decodedPayload._id, error),
            onSome: data => (this[INTERNALS_MARKER].rescue as (payload: unknown, id: string, error: Error) => Effect.Effect<void, never, any>)(data, decodedPayload._id, error),
          })
        }).pipe(
          Effect.asVoid,
          telemetry.withTelemetrySpan(`queue_job_rescue<${this._tag}>`, {
            attributes: {
              queue_job_tag: this._tag,
              error: error.message,
              error_stack: error.stack,
            },
          }),
          telemetry.withScopedTelemetry('queue_job'),
        )
      }).pipe(ApplicationRuntimeExecution.runPromise())
    }

    /**
     * String representation of the queue job class for debugging purposes.
     */
    toString() {
      return `QueueJob<${this._tag}>`
    }

    /**
     * JSON representation of the queue job class for debugging purposes.
     */
    toJSON() {
      return {
        _tag: this._tag,
      }
    }
  }
  ; (Factory.prototype as any).name = tag
  return Factory
}

/**
 * Instance type of the base queue job class that is created
 * from the factory function.
 */
type BaseInstance<T extends string, S extends Schema.Schema<any, any> | undefined, E> = InstanceType<ReturnType<typeof base<T, S, E>>>

/**
 * Factory function to create a queue job class with the unique tag
 * and provided factory options along with the path to the job file.
 *
 * Tag is prefixed with `@queue_job/` to ensure uniqueness and avoid conflicts
 * with other queue job classes in the application.
 *
 * @param tag - The unique tag for the queue job class.
 * @param path - The path to the job file. It is usually `import.meta.url`.
 */
export function QueueJob<T extends string>(tag: T, path: string) {
    type RT = `@queue_job/${T}`
    const resolvedTag = `@queue_job/${tag}` as RT

    /**
     * @param factoryOptions - The options for creating the queue job class.
     */
    return <S extends Schema.Schema<any, any> | undefined = undefined, E = never>(factoryOptions: QueueJobFactoryOptions<S, E>) => {
      class BaseQueueJob extends base<RT, S, E>(resolvedTag, factoryOptions) {
        static get $$filepath() { return path }

        /**
         * The default options for the queue job class that can be overridden
         * when dispatching the job to the queue.
         */
        static get options() { return defu(factoryOptions.options, {}) as QueueOptions }

        /**
         * The schema that describes the payload of the job to be processed
         * by the queue.
         */
        static get schema() { return defaultTo(factoryOptions.schema, Schema.Unknown) as S extends undefined ? typeof Schema.Unknown : S }

        /**
         * The path to the job file. It is usually `import.meta.url`.
         */
        static get path() { return path }

        /**
         * The unique tag for the queue job class.
         */
        static get tag() { return resolvedTag }

        /**
         * The inspectable properties of the queue job class for debugging
         * and telemetry purposes.
         */
        static get toInspectable(): QueueJobToInspectable<RT, S, E> {
          return {
            _tag: resolvedTag,
            schema: defaultTo(factoryOptions.schema, Schema.Unknown) as S extends undefined ? typeof Schema.Unknown : S,
            handle: factoryOptions.handle,
            rescue: defaultTo(factoryOptions.rescue, () => Effect.void),
          }
        }
      }
      ;(BaseQueueJob.prototype as any).name = resolvedTag
      ;(BaseQueueJob as any).__tag__ = resolvedTag

      return BaseQueueJob as unknown as
        & (new () => Brand.Branded<InstanceType<typeof BaseQueueJob>, typeof QUEUE_JOB_MARKER>)
        & {
          /**
           * The default options for the queue job class that can be overridden
           * when dispatching the job to the queue.
           */
          readonly options: QueueOptions;

          /**
           * The schema that describes the payload of the job to be processed
           * by the queue.
           */
          readonly schema: S extends undefined ? typeof Schema.Unknown : S;

          /**
           * The path to the job file. It is usually `import.meta.url`.
           */
          readonly path: string;

          /**
           * The unique tag for the queue job class.
           */
          readonly tag: RT;

          /**
           * The inspectable properties of the queue job class for debugging
           */
          readonly toInspectable: QueueJobToInspectable<RT, S, E>;

          /**
           * The unique marker for the queue job class.
           */
          readonly [QUEUE_JOB_MARKER]: typeof QUEUE_JOB_MARKER;
        }
    }
}

/**
 * The instance type of the queue job class that is created
 * using the queue job factory function.
 */
export type QueueJob<T extends string, S extends Schema.Schema<any, any> | undefined, E> = Brand.Branded<BaseInstance<T, S, E>, typeof QUEUE_JOB_MARKER>

/**
 * The type of the queue job class that is created
 * using the queue job factory function.
 */
export type QueueJobClass<T extends string, S extends Schema.Schema<any, any> | undefined, E>
  = & (new () => QueueJob<T, S, E>)
    & {
    /**
     * The default options for the queue job class that can be overridden
     * when dispatching the job to the queue.
     */
      readonly options: QueueOptions;

      /**
       * The schema that describes the payload of the job to be processed
       * by the queue.
       */
      readonly schema: S extends undefined ? typeof Schema.Unknown : S;

      /**
       * The path to the job file. It is usually `import.meta.url`.
       */
      readonly path: string;

      /**
       * The unique tag for the queue job class.
       */
      readonly tag: T;

      /**
       * The inspectable properties of the queue job class for debugging
       * and telemetry purposes.
       */
      readonly toInspectable: QueueJobToInspectable<T, S, E>;

      /**
       * The unique marker for the queue job class.
       */
      readonly [QUEUE_JOB_MARKER]: typeof QUEUE_JOB_MARKER;
    }

/**
 * Helper type to infer the schema type of a queue job class or instance.
 *
 * If the schema is undefined, it returns `UndefinedSchema`.
 * Otherwise, it returns the schema type.
 *
 * @see {@link UndefinedSchema} for more information.
 */
export type InferQueueJobSchema<T extends QueueJob<string, Schema.Schema<any, any> | undefined, any> | QueueJobClass<string, Schema.Schema<any, any> | undefined, any>>
  = T extends QueueJob<string, infer S, any>
    ? S extends undefined
      ? UndefinedSchema
      : S
    : T extends QueueJobClass<string, infer S, any>
      ? S extends undefined
        ? UndefinedSchema
        : S
      : never
