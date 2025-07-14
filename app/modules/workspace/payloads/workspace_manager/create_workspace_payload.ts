import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import User from '#models/user_model'
import { MultipartFileFromSelfSchema } from '#shared/schemas/general/file'
import { WorkspaceSlug } from '#shared/schemas/workspace/workspace_attributes'
import { Schema } from 'effect'

export default class CreateWorkspacePayload extends DataPayload('modules/workspace/workspace_manager/create_workspace')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    user: SchemaFromLucidModel(User),
    set_default_workspace: Schema.optionalWith(Schema.Union(Schema.Boolean, Schema.Literal('safe_set')), { nullable: true, default: () => 'safe_set' }),
    workspace: Schema.Struct({
      name: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(3), Schema.maxLength(100)),
      slug: SchemaFromSchemaAttribute(WorkspaceSlug),
      website: Schema.optionalWith(Schema.NonEmptyTrimmedString, { nullable: true }),
      logo: Schema.optionalWith(MultipartFileFromSelfSchema, { nullable: true }),
      industry: Schema.optionalWith(Schema.NonEmptyTrimmedString, { nullable: true }),
    }),
  }),
}) {}
