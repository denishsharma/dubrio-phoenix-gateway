/*
|--------------------------------------------------------------------------
| Effect Runtime Configuration
|--------------------------------------------------------------------------
|
| Here you can define the configuration for the Effect runtime.
| You can define the dependencies that the runtime will use to run
| the effect program.
|
*/

import { CORE_DATA_PAYLOAD_MODULE_LAYER } from '#core/data_payload/data_payload_module'
import { CORE_DATABASE_MODULE_LAYER } from '#core/database/database_module'
import { CORE_EFFECT_MODULE_LAYER } from '#core/effect/effect_module'
import { CORE_ERROR_MODULE_LAYER } from '#core/error/error_module'
import { CORE_HTTP_MODULE_LAYER } from '#core/http/http_module'
import { CORE_JSON_MODULE_LAYER } from '#core/json/json_module'
import { CORE_LUCID_MODULE_LAYER } from '#core/lucid/lucid_module'
import { CORE_MAIL_MODULE_LAYER } from '#core/mail/mail_module'
import { CORE_QUEUE_JOB_MODULE_LAYER } from '#core/queue_job/queue_job_module'
import { CORE_SCHEMA_MODULE_LAYER } from '#core/schema/schema_module'
import { CORE_TELEMETRY_MODULE_LAYER } from '#core/telemetry/telemetry_module'
import { CORE_VALIDATION_MODULE_LAYER } from '#core/validation/validation_module'
import { IDENTITY_ACCESS_MANAGEMENT_MODULE_LAYER } from '#modules/iam/iam_module'
import { SPACE_MODULE_LAYER } from '#modules/space/space_module'
import { WORKSPACE_MODULE_LAYER } from '#modules/workspace/workspace_module'
import { SHARED_COMMON_MODULE_LAYER } from '#shared/common/common_module'
import { SHARED_STORAGE_MODULE_LAYER } from '#shared/storage/storage_module'
import { Layer, ManagedRuntime } from 'effect'

/**
 * This is a layer that provides the dependencies needed
 * for the application runtime to execute the effectful program.
 */
export const APPLICATION_RUNTIME_DEPENDENCIES_LAYER = Layer.mergeAll(
  CORE_DATA_PAYLOAD_MODULE_LAYER,
  CORE_DATABASE_MODULE_LAYER,
  CORE_EFFECT_MODULE_LAYER,
  CORE_ERROR_MODULE_LAYER,
  CORE_HTTP_MODULE_LAYER,
  CORE_JSON_MODULE_LAYER,
  CORE_LUCID_MODULE_LAYER,
  CORE_MAIL_MODULE_LAYER,
  CORE_QUEUE_JOB_MODULE_LAYER,
  CORE_SCHEMA_MODULE_LAYER,
  CORE_TELEMETRY_MODULE_LAYER,
  CORE_VALIDATION_MODULE_LAYER,

  SHARED_COMMON_MODULE_LAYER,
  SHARED_STORAGE_MODULE_LAYER,

  IDENTITY_ACCESS_MANAGEMENT_MODULE_LAYER,
  WORKSPACE_MODULE_LAYER,
  SPACE_MODULE_LAYER,
)

/**
 * Runtime for the application to execute effectful programs
 * using the Effect library.
 *
 * It is a managed runtime that provides the necessary
 * dependencies for the application to run.
 */
export const ApplicationRuntime = ManagedRuntime.make(APPLICATION_RUNTIME_DEPENDENCIES_LAYER)
