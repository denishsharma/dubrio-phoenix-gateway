import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import { Schema } from 'effect'

export default class CurrentWorkspaceSession extends Schema.Class<CurrentWorkspaceSession>('@schema/modules/workspace/current_workspace_session')({
  workspace_identifier: Schema.transform(
    Schema.ULID,
    SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
    {
      strict: true,
      decode: value => WorkspaceIdentifier.make(value),
      encode: identifier => identifier.value,
    },
  ),
}) {}
