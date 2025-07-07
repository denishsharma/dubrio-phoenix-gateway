import type { InferQueueJobSchema, QueueJobClass } from '#core/queue_job/factories/queue_job'
import type { IsUndefinedSchema } from '#core/schema/types/schema'
import type queue from '@rlanz/bull-queue/services/main'
import type { Brand, Schema } from 'effect'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Match, Option } from 'effect'

/**
 * Unique symbol used to mark the `WithQueueJob` type.
 * This symbol is used to differentiate the `WithQueueJob` type from other types.
 */
export const WITH_QUEUE_JOB_MARKER: unique symbol = Symbol('@constant/wrapper/core/queue_job/with_queue_job')

/**
 * The options for customizing the queue job.
 */
export type WithQueueJobOptions = Parameters<typeof queue.dispatch>[2]

/**
 * Type representing the shape of the `WithQueueJob` type used to define the structure
 * of the queue job that can be dispatched.
 */
export type WithQueueJob<
  U extends QueueJobClass<string, Schema.Schema<any, any> | undefined, any>,
  S extends InferQueueJobSchema<U> = InferQueueJobSchema<U>,
> = Brand.Branded<{
  job: U;
  payload: IsUndefinedSchema<S> extends true ? () => Option.None<never> : () => Option.Some<Schema.Schema.Encoded<S>>;
  options: WithQueueJobOptions;
}, typeof WITH_QUEUE_JOB_MARKER>

/**
 * Type representing the parameters that can be passed to the `WithQueueJob` function.
 * It can accept a job class, an optional payload function, and an optional options object.
 */
export type WithQueueJobParameters<
  U extends QueueJobClass<string, Schema.Schema<any, any> | undefined, any>,
  S extends InferQueueJobSchema<U> = InferQueueJobSchema<U>,
>
  = IsUndefinedSchema<S> extends true
    ? [job: U, options?: WithQueueJobOptions]
    : IsUndefinedSchema<Schema.Schema.Type<S>> extends true
      ? [job: U, options?: WithQueueJobOptions]
      : [job: U, payload: () => Schema.Schema.Encoded<S>, options?: WithQueueJobOptions]

/**
 * The `WithQueueJob` is a holder function that represents a queue job
 * that can be dispatched to the queue with the specified payload and options.
 *
 * @param job - The job class that defines the queue job.
 * @param payload - Possible payload function that will be used to encode the job payload.
 * @param options - Optional options to be used with the queue job.
 */
export function WithQueueJob<U extends QueueJobClass<string, Schema.Schema<any, any> | undefined, any>>(...args: WithQueueJobParameters<U>) {
  interface FunctionArguments {
    job: U;
    payloadOrOptions: WithQueueJobOptions | (() => Schema.Schema.Encoded<InferQueueJobSchema<U>>) | undefined;
    options: WithQueueJobOptions | undefined;
  }

  /**
   * Resolve the arguments passed to the `WithQueueJob` function.
   * It will determine the job, payload, and options based on the provided arguments.
   */
  const resolvedArguments = Match.type<FunctionArguments>().pipe(
    Match.withReturnType<{
      job: U;
      payload: Option.Option<IsUndefinedSchema<InferQueueJobSchema<U>>>;
      options: WithQueueJobOptions;
    }>(),
    Match.when(
      ({ payloadOrOptions }) => is.function(payloadOrOptions),
      ({ job, payloadOrOptions, options }) => {
        return {
          job,
          payload: Option.some((payloadOrOptions as () => Schema.Schema.Encoded<InferQueueJobSchema<U>>)()),
          options: defu(options, job.options, {}),
        }
      },
    ),
    Match.orElse(({ job, payloadOrOptions }) => {
      return {
        job,
        payload: Option.none(),
        options: defu(payloadOrOptions, job.options, {}),
      }
    }),
  )({ job: args[0], payloadOrOptions: args[1], options: args[2] })

  return {
    job: resolvedArguments.job,
    payload: () => resolvedArguments.payload,
    options: resolvedArguments.options,
  } as WithQueueJob<U>
}
