import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { MultipartFileFromSelfSchema } from '#shared/schemas/general/file'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import { Schema } from 'effect'

export default class EnsureWorkspaceLogoPayload extends DataPayload('modules/workspace/workspace_manager/ensure_workspace_logo')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    workspace: Schema.Struct({
      identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
      name: Schema.NonEmptyTrimmedString,
      logo: Schema.optionalWith(MultipartFileFromSelfSchema, { nullable: true }),
    }),
  }),
}) {}
