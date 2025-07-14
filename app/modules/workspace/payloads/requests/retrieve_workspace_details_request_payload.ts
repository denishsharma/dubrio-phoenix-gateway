import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

export default class RetrieveWorkspaceDetailsRequestPayload extends DataPayload('modules/workspace/requests/retrieve_workspace_details_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      __params: vine.object({
        id: vine.string().trim().ulid(),
      }),
    }),
  ),
  schema: Schema.Struct({
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
  }),
  mapToSchema: payload => Effect.sync(() => {
    return {
      workspace_identifier: WorkspaceIdentifier.make(payload.__params.id),
    }
  }),
}) {}
