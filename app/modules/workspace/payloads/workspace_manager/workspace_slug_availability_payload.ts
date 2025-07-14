import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import { WorkspaceSlug } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class WorkspaceSlugAvailabilityPayload extends DataPayload('modules/workspace/workspace_manager/workspace_slug_availability')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      slug: vine.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).minLength(1).maxLength(100),
    }),
  ),
  schema: Schema.Struct({
    workspace_slug: SchemaFromSchemaAttribute(WorkspaceSlug),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    return {
      workspace_slug: yield* WorkspaceSlug.make(payload.slug),
    }
  }),
}) {}
