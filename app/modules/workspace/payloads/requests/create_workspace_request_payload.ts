import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import { MultipartFileFromSelfSchema } from '#shared/schemas/general/file'
import { WorkspaceSlug } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class CreateWorkspaceRequestPayload extends DataPayload('modules/workspace/workspace_manager/create_workspace_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      name: vine.string().trim().minLength(3).maxLength(100),
      slug: vine.string().trim().minLength(3).maxLength(50),
      website: vine.string().trim().url().optional(),
      logo: vine.file({
        extnames: [
          'jpg',
          'jpeg',
          'png',
        ],
        size: '2mb',
      }).optional(),
      industry: vine.string().trim().optional(),
    }),
  ),
  schema: Schema.Struct({
    name: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(3), Schema.maxLength(100)),
    slug: SchemaFromSchemaAttribute(WorkspaceSlug),
    website: Schema.optionalWith(Schema.NonEmptyTrimmedString, { nullable: true }),
    logo: Schema.optionalWith(MultipartFileFromSelfSchema, { nullable: true }),
    industry: Schema.optionalWith(Schema.NonEmptyTrimmedString, { nullable: true }),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    return {
      name: payload.name,
      slug: yield* WorkspaceSlug.make(payload.slug),
      website: payload.website,
      logo: payload.logo,
      industry: payload.industry,
    }
  }),
}) {}
