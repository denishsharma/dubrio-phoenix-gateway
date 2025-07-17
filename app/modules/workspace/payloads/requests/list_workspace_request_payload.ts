import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class ListWorkspaceRequestPayload extends DataPayload('modules/workspace/requests/list_workspace_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      // No query parameters needed for listing user's workspaces
    }),
  ),
  schema: Schema.Struct({
    // No fields needed - we'll get workspaces for authenticated user
  }),
  mapToSchema: _payload => Effect.sync(() => {
    return {}
  }),
}) {}
