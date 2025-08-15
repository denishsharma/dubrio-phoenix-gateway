import { CONTACT_ATTRIBUTE_DATA_TYPE } from '#constants/contact_attribute_data_type'
import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { ContactAttributeIdentifier } from '#shared/schemas/contact/contact_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Match, Schema } from 'effect'

export default class UpdateContactAttributeRequestPayload extends DataPayload('modules/contact/payloads/request/contact_attribute/update_contact_attribute_request_payload')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      __qs: vine.object({
        workspace_id: vine.string().trim().ulid().optional(),
      }),
      __params: vine.object({
        id: vine.string().trim().ulid(),
      }),
      mode: vine.enum(['replace', 'patch']),
      data: vine.object({
        name: vine.string().trim().minLength(1).maxLength(100).optional(),
        data_type: vine.enum(CONTACT_ATTRIBUTE_DATA_TYPE.values()).optional(),
        is_required: vine.boolean().optional(),
        is_unique: vine.boolean().optional(),
        options: vine.array(
          vine.object({
            option_value: vine.string().trim().minLength(1).maxLength(100),
            option_label: vine.string().trim().minLength(1).maxLength(100),
          }),
        ).optional(),
      }),
    }),
  ),
  schema: Schema.Struct({
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
    id: SchemaFromLucidModelIdentifier(ContactAttributeIdentifier),
    mode: Schema.Literal('replace', 'patch'),
    data: Schema.Struct({
      name: Schema.optional(Schema.NonEmptyTrimmedString),
      data_type: Schema.optional(Schema.Literal(...CONTACT_ATTRIBUTE_DATA_TYPE.values())),
      is_required: Schema.optional(Schema.Boolean),
      is_unique: Schema.optional(Schema.Boolean),
      options: Schema.optional(Schema.Array(
        Schema.Struct({
          option_value: Schema.NonEmptyTrimmedString,
          option_label: Schema.NonEmptyTrimmedString,
        }),
      )),
    }),
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
      mode: payload.mode,
      data: payload.data,
    }
  }),
}) {}
