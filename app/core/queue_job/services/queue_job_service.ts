import type { WithQueueJob, WithQueueJobOptions } from '#core/queue_job/constants/with_queue_job'
import type { InferQueueJobSchema, QueueJobClass } from '#core/queue_job/factories/queue_job'
import QueueJobDispatchError from '#core/queue_job/errors/queue_job_dispatch_error'
import QueueJobPayloadError from '#core/queue_job/errors/queue_job_payload_error'
import { withJobPayloadSchema } from '#core/queue_job/factories/queue_job'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import { cuid } from '@adonisjs/core/helpers'
import queue from '@rlanz/bull-queue/services/main'
import { defu } from 'defu'
import { Effect, Inspectable, pipe, Schema } from 'effect'

export default class QueueJobService extends Effect.Service<QueueJobService>()('@service/core/queue_job', {
  dependencies: [TelemetryService.Default],
  effect: Effect.gen(function* () {
    const telemetry = yield* TelemetryService

    function dispatch<U extends QueueJobClass<string, Schema.Schema<any, any> | undefined, any>, S extends InferQueueJobSchema<U> = InferQueueJobSchema<U>>(queueJob: WithQueueJob<U, S>) {
      return Effect.gen(function* () {
        /**
         * Generate a unique ID for the job.
         */
        const id = cuid()

        /**
         * Annotate the current span with the job ID and name.
         */
        yield* Effect.annotateCurrentSpan('job_id', id)
        yield* Effect.annotateCurrentSpan('job_tag', queueJob.job.tag)

        /**
         * Create a payload object with the job ID and payload.
         */
        const payload = {
          _id: id,
          _payload: queueJob.payload(),
        }

        /**
         * Encode the payload using the job schema
         * and handle any errors that may occur during encoding.
         */
        const encodedPayload = yield* pipe(
          payload,
          Schema.decode(
            Schema.Struct({
              _id: Schema.String,
              _payload: Schema.OptionFromSelf(queueJob.job.schema),
            }),
            { errors: 'all' },
          ),
          QueueJobPayloadError.fromParseError(
            queueJob.job.tag,
            'decode',
            `Unexpected error occurred while decoding the payload for the job '${queueJob.job.tag}'.`,
          ),
          Effect.flatMap(
            Schema.encode(withJobPayloadSchema(queueJob.job.schema), { errors: 'all' }),
          ),
          QueueJobPayloadError.fromParseError(
            queueJob.job.tag,
            'encode',
            `Unexpected error occurred while encoding the payload for the job '${queueJob.job.tag}'.`,
          ),
        )

        /**
         * Dispatch the job to the queue with the encoded payload and options.
         * The job ID is passed as an option to the queue.
         */
        const job = yield* Effect.tryPromise({
          try: async () => await queue.dispatch(() => import(queueJob.job.path), Inspectable.toJSON(encodedPayload) as never, defu(queueJob.options, { jobId: id } satisfies Partial<WithQueueJobOptions>)),
          catch: QueueJobDispatchError.fromUnknownError({ id, job: queueJob.job.name, payload: encodedPayload._payload }),
        })

        /**
         * Return the job ID and the dispatched job.
         */
        return { id, job: job as Awaited<ReturnType<typeof queue.dispatch>> }
      }).pipe(telemetry.withTelemetrySpan('dispatch_queue_job'))
    }

    return {
      /**
       * Dispatch a job to the queue with the provided job class
       * and payload and provided queue job options.
       *
       * @param queueJob - The job class and payload to dispatch.
       * @param payload - The available payload to dispatch to the job.
       * @param options - The options to use when dispatching the job.
       */
      dispatch,
    }
  }),
}) {}
