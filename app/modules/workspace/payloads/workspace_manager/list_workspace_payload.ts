import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import { Schema } from 'effect'

export default class ListWorkspacePayload extends DataPayload('modules/workspace/workspace_manager/list_workspace')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    user_identifier: Schema.Number,
  }),
}) {}
