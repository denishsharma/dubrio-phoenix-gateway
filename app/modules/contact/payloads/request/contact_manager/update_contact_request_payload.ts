import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { ContactIdentifier } from '#shared/schemas/contact/contact_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Match, Schema } from 'effect'
import { merge } from 'lodash-es'

const PUT_VALIDATION_SCHEMA = {
  mode: vine.literal('replace'),
  data: vine.object({
    first_name: vine.string().trim().minLength(2),
    last_name: vine.string().trim().optional(),
    email_address: vine.string().trim().normalizeEmail().optional(),
    phone_number: vine.string().trim().optional(),
  }),
}

const PATCH_VALIDATION_SCHEMA = {
  mode: vine.literal('partial'),
  data: vine.object({
    first_name: vine.string().trim().minLength(2).optional(),
    last_name: vine.string().trim().optional(),
    email_address: vine.string().trim().normalizeEmail().optional(),
    phone_number: vine.string().trim().optional(),
  }),
}

const UPDATE_CONTACT_VALIDATION = vine.group([
  vine.group.if(d => d.mode === 'replace', PUT_VALIDATION_SCHEMA),
  vine.group.if(d => d.mode === 'partial', PATCH_VALIDATION_SCHEMA),
])

export default class UpdateContactRequestPayload extends DataPayload('modules/contact/requests/update_contact_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      mode: vine.enum(['replace', 'partial']),
      __params: vine.object({
        id: vine.string().trim().ulid(),
      }),
      __qs: vine.object({
        workspace_id: vine.string().trim().ulid().optional(),
      }),
    }).merge(UPDATE_CONTACT_VALIDATION),
  ),
  schema: Schema.extend(
    Schema.Struct({
      contact_identifier: Schema.transform(
        Schema.ULID,
        SchemaFromLucidModelIdentifier(ContactIdentifier),
        {
          strict: true,
          decode: value => ContactIdentifier.make(value),
          encode: identifier => identifier.value,
        },
      ),
      workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
    }),
    Schema.Union(
      Schema.Struct({
        mode: Schema.Literal('replace'),
        data: Schema.Struct({
          first_name: Schema.String,
          last_name: Schema.optional(Schema.String),
          email_address: Schema.optional(Schema.String),
          phone_number: Schema.optional(Schema.String),
        }),
      }),
      Schema.Struct({
        mode: Schema.Literal('partial'),
        data: Schema.partial(
          Schema.Struct({
            first_name: Schema.String,
            last_name: Schema.String,
            email_address: Schema.String,
            phone_number: Schema.String,
          }),
        ),
      }),
    ),
  ),
  mapToSchema: payload => Effect.gen(function* () {
    const workspaceSessionService = yield* WorkspaceSessionService

    /**
     * Retrieve the workspace identifier from the payload or the active workspace session.
     *
     * Priority is given to the payload's workspace_id if provided,
     * otherwise, it falls back to the active workspace session.
     */
    const workspaceIdentifier = yield* Match.value(payload.__qs.workspace_id).pipe(
      Match.when(Match.defined, id => Effect.succeed(WorkspaceIdentifier.make(id))),
      Match.orElse(() => workspaceSessionService.activeWorkspaceIdentifier),
    )

    return merge(
      {},
      {
        contact_identifier: payload.__params.id,
        workspace_identifier: workspaceIdentifier,
      },
      payload.mode === 'replace'
        ? {
            mode: payload.mode,
            data: {
              first_name: payload.data.first_name,
              last_name: payload.data.last_name ?? undefined,
              email_address: payload.data.email_address ?? undefined,
              phone_number: payload.data.phone_number ?? undefined,
            },
          }
        : {
            mode: payload.mode,
            data: payload.data,
          },
    )
  }),
}) {}
