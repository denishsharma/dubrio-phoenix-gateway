import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { ContactAttributeIdentifier } from '#shared/schemas/contact/contact_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Match, Schema } from 'effect'

export default class DeleteContactAttributeRequestPayload extends DataPayload('modules/contact/payloads/request/contact_attribute/delete_contact_attribute_request_payload')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      __qs: vine.object({
        workspace_id: vine.string().trim().ulid().optional(),
      }),
      __params: vine.object({
        id: vine.string().trim().ulid(),
      }),
    }),
  ),
  schema: Schema.Struct({
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
    id: SchemaFromLucidModelIdentifier(ContactAttributeIdentifier),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    const workspaceSessionService = yield* WorkspaceSessionService

    const workspaceIdentifier = yield* Match.value(payload.__qs.workspace_id).pipe(
      Match.when(Match.defined, id => Effect.succeed(WorkspaceIdentifier.make(id))),
      Match.orElse(() => workspaceSessionService.activeWorkspaceIdentifier),
    )

    return {
      workspace_identifier: workspaceIdentifier,
      id: ContactAttributeIdentifier.make(payload.__params.id),
    }
  }),
}) {}
