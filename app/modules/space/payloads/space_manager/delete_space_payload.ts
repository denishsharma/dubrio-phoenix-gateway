import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import { Schema } from 'effect'

export default class DeleteSpacePayload extends DataPayload('modules/space/payloads/space_manager/delete_space')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
    space_identifier: SchemaFromLucidModelIdentifier(SpaceIdentifier),
  }),
}) {}
