import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { MultipartFileFromSelfSchema } from '#shared/schemas/general/file'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import { Schema } from 'effect'

export default class UpdateWorkspaceDetailsPayload extends DataPayload('modules/workspace/workspace_manager/update_workspace_details')({
  kind: DataPayloadKind.DATA,
  schema: Schema.extend(
    Schema.Struct({
      workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
    }),
    Schema.Union(
      Schema.Struct({
        mode: Schema.Literal('replace'),
        details: Schema.Struct({
          name: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(3), Schema.maxLength(100)),
          website: Schema.optional(Schema.NullOr(Schema.NonEmptyTrimmedString)),
          logo: Schema.optional(Schema.NullOr(MultipartFileFromSelfSchema)),
          industry: Schema.optional(Schema.NullOr(Schema.NonEmptyTrimmedString)),
        }),
      }),
      Schema.Struct({
        mode: Schema.Literal('partial'),
        details: Schema.Struct({
          name: Schema.optional(Schema.NullOr(Schema.NonEmptyTrimmedString.pipe(Schema.minLength(3), Schema.maxLength(100)))),
          website: Schema.optional(Schema.NullOr(Schema.NonEmptyTrimmedString)),
          logo: Schema.optional(Schema.NullOr(MultipartFileFromSelfSchema)),
          industry: Schema.optional(Schema.NullOr(Schema.NonEmptyTrimmedString)),
        }),
      }),
    ),
  ),
}) {}
