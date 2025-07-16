import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Match, Schema } from 'effect'
import { merge } from 'lodash-es'

const PUT_VALIDATION_SCHEMA = {
  mode: vine.literal('replace'),
  data: vine.object({
    name: vine.string().trim().minLength(3).maxLength(64),
    tag: vine.string().trim().maxLength(64),
    icon: vine.string().trim().optional(),
  }),
}

const PATCH_VALIDATION_SCHEMA = {
  mode: vine.literal('partial'),
  data: vine.object({
    name: vine.string().trim().minLength(2).optional(),
    tag: vine.string().trim().minLength(2).optional(),
    icon: vine.string().url().optional(),
  }),
}

const UPDATE_SPACE_VALIDATION = vine.group([
  vine.group.if(d => d.mode === 'replace', PUT_VALIDATION_SCHEMA),
  vine.group.if(d => d.mode === 'partial', PATCH_VALIDATION_SCHEMA),
])

export default class UpdateSpaceRequestPayload extends DataPayload('modules/space/payloads/request/update_space_request')({
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
    }).merge(UPDATE_SPACE_VALIDATION),
  ),
  schema: Schema.extend(
    Schema.Struct({
      space_identifier: Schema.transform(
        Schema.ULID,
        SchemaFromLucidModelIdentifier(SpaceIdentifier),
        {
          strict: true,
          decode: value => SpaceIdentifier.make(value),
          encode: identifier => identifier.value,
        },
      ),
      workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
    }),
    Schema.Union(
      Schema.Struct({
        mode: Schema.Literal('replace'),
        data: Schema.Struct({
          name: Schema.String,
          tag: Schema.String,
          icon: Schema.optional(Schema.String),
        }),
      }),
      Schema.Struct({
        mode: Schema.Literal('partial'),
        data: Schema.partial(
          Schema.Struct({
            name: Schema.String,
            tag: Schema.String,
            icon: Schema.String,
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
        space_identifier: payload.__params.id,
        workspace_identifier: workspaceIdentifier,
      },
      payload.mode === 'replace'
        ? {
            mode: payload.mode,
            data: {
              name: payload.data.name,
              tag: payload.data.tag,
              icon: payload.data.icon ?? undefined,
            },
          }
        : {
            mode: payload.mode,
            data: payload.data,
          },
    )
  }),
}) {}
