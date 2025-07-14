import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import Workspace from '#models/workspace_model'
import { WorkspaceMemberRole } from '#modules/workspace/constants/workspace_member_role'
import { WorkspaceMemberStatus } from '#modules/workspace/constants/workspace_member_status'
import { UserIdentifier, UserPrimaryIdentifier } from '#shared/schemas/user/user_attributes'
import { Schema } from 'effect'

export default class AddWorkspaceMemberPayload extends DataPayload('modules/workspace/workspace_member/add_workspace_member')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    workspace: SchemaFromLucidModel(Workspace),
    existing_members: Schema.optionalWith(Schema.Literal('ignore', 'strict'), { nullable: true, default: () => 'strict' }),
    members: Schema.ArrayEnsure(
      Schema.Struct({
        user_identifier_or_primary_identifier: Schema.Union(
          SchemaFromLucidModelIdentifier(UserIdentifier),
          SchemaFromLucidModelIdentifier(UserPrimaryIdentifier),
        ),
        role: Schema.optionalWith(Schema.Enums(WorkspaceMemberRole), { nullable: true, default: () => WorkspaceMemberRole.ADMIN }),
        status: Schema.optionalWith(Schema.Enums(WorkspaceMemberStatus), { nullable: true, default: () => WorkspaceMemberStatus.ACTIVE }),
        joined_at: Schema.optionalWith(Schema.DateFromSelf, { nullable: true, default: () => new Date() }),
      }),
    ),
  }),
}) {}
