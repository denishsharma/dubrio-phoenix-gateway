import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import WorkspaceInvitationToken from '#modules/workspace/schemas/workspace_member/workspace_invitation_token'
import { Schema } from 'effect'

export default class RetrieveInvitationDetailsPayload extends DataPayload('modules/workspace/workspace_invitation/retrieve_invitation_details')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    token: SchemaFromSchemaAttribute(WorkspaceInvitationToken),
  }),
}) {}
