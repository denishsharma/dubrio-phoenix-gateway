import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { WorkspaceMemberRole } from '#modules/workspace/constants/workspace_member_role'
import { WorkspaceMemberStatus } from '#modules/workspace/constants/workspace_member_status'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { Schema } from 'effect'

export default class WorkspaceMemberDetails extends Schema.Class<WorkspaceMemberDetails>('@schema/modules/workspace/workspace_member/workspace_member_details')({
  invited_by: Schema.optional(Schema.NullOr(SchemaFromLucidModelIdentifier(UserIdentifier))),
  joined_at: Schema.optional(Schema.NullOr(Schema.DateFromSelf)),
  role: Schema.Enums(WorkspaceMemberRole),
  status: Schema.Enums(WorkspaceMemberStatus),
}) {}
