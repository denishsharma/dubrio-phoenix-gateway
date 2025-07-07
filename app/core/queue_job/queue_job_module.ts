import QueueJobService from '#core/queue_job/services/queue_job_service'
import { Layer } from 'effect'

export const CORE_QUEUE_JOB_MODULE_LAYER = Layer.mergeAll(
  QueueJobService.Default,
)
