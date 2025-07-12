import { LucidModelIdentifierSupport } from '#core/lucid/constants/lucid_model_identifier_support'
import { LucidModelIdentifier } from '#core/lucid/factories/lucid_model_identifier'

export class WorkspacePrimaryIdentifier extends LucidModelIdentifier('shared/schemas/workspace/workspace_attributes/workspace_primary_identifier')({
  marker: Symbol('@marker/shared/schemas/workspace/workspace_attributes/workspace_primary_identifier'),
  support: LucidModelIdentifierSupport.INTEGER_ID_AS_ID,
}) {}

export class WorkspaceIdentifier extends LucidModelIdentifier('shared/schemas/workspace/workspace_attributes/workspace_identifier')({
  marker: Symbol('@marker/shared/schemas/workspace/workspace_attributes/workspace_identifier'),
  support: LucidModelIdentifierSupport.ULID_AS_UID,
}) {}
