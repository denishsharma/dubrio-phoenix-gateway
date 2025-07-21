import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import WorkspaceInvitationToken from '#modules/workspace/schemas/workspace_member/workspace_invitation_token'
import { Schema } from 'effect'

export default class AcceptWorkspaceInvitationPayload extends DataPayload('modules/workspace/workspace_invitation/accept_workspace_invitation')({
  kind: DataPayloadKind.DATA,
  schema: Schema.extend(
    Schema.Struct({
      token: SchemaFromSchemaAttribute(WorkspaceInvitationToken),
    }),
    Schema.Union(
      Schema.Struct({
        mode: Schema.Literal('accept'),
      }),
      Schema.Struct({
        mode: Schema.Literal('register'),
        first_name: Schema.NonEmptyTrimmedString,
        last_name: Schema.optional(Schema.NonEmptyTrimmedString),
        password: Schema.Redacted(Schema.NonEmptyTrimmedString),
      }),
      Schema.Struct({
        mode: Schema.Literal('login'),
        password: Schema.Redacted(Schema.NonEmptyTrimmedString),
      }),
    ),
  ),
}) {}
