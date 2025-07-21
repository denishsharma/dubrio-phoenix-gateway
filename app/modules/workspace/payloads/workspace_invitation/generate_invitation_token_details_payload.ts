import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import { Schema } from 'effect'

export default class GenerateInvitationTokenDetailsPayload extends DataPayload('modules/workspace/workspace_invitation/generate_invitation_token_details')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
    invited_by_user_identifier: SchemaFromLucidModelIdentifier(UserIdentifier),
    space_identifier: Schema.optionalWith(SchemaFromLucidModelIdentifier(SpaceIdentifier), { nullable: true }),
    invitee_email_address: Schema.String,
  }),
}) {}
