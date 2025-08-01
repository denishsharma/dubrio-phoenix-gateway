import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Match, Schema } from 'effect'

export default class CreateContactRequestPayload extends DataPayload('modules/contact/requests/contact/create_contact_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      first_name: vine.string().minLength(2).trim(),
      last_name: vine.string().trim().optional(),
      email_address: vine.string().trim().normalizeEmail().optional(),
      phone_number: vine.string().trim().optional(),
      __qs: vine.object({
        workspace_id: vine.string().trim().ulid().optional(),
      }),
    }),
  ),
  schema: Schema.Struct({
    first_name: Schema.NonEmptyTrimmedString,
    last_name: Schema.optional(Schema.NonEmptyTrimmedString),
    email_address: Schema.optional(Schema.NonEmptyTrimmedString),
    phone_number: Schema.optional(Schema.NonEmptyTrimmedString),
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    const workspaceSessionService = yield* WorkspaceSessionService

    const workspaceIdentifier = yield* Match.value(payload.__qs.workspace_id).pipe(
      Match.when(Match.defined, id => Effect.succeed(WorkspaceIdentifier.make(id))),
      Match.orElse(() => workspaceSessionService.activeWorkspaceIdentifier),
    )

    return {
      first_name: payload.first_name,
      last_name: payload.last_name,
      email_address: payload.email_address,
      phone_number: payload.phone_number,
      workspace_identifier: workspaceIdentifier,
    }
  }),
}) {}
