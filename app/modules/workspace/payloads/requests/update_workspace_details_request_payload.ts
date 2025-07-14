import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { MultipartFileFromSelfSchema } from '#shared/schemas/general/file'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

const REPLACE_VALIDATION_SCHEMA = {
  mode: vine.literal('replace'),
  details: vine.object({
    name: vine.string().trim().minLength(3).maxLength(100),
    website: vine.string().trim().url().nullable().optional(),
    logo: vine.file({
      extnames: [
        'jpg',
        'jpeg',
        'png',
      ],
      size: '2mb',
    }).nullable().optional(),
    industry: vine.string().trim().nullable().optional(),
  }),
}

const PARTIAL_VALIDATION_SCHEMA = {
  mode: vine.literal('partial'),
  details: vine.object({
    name: vine.string().trim().minLength(3).maxLength(100).nullable().optional(),
    website: vine.string().trim().url().nullable().optional(),
    logo: vine.file({
      extnames: [
        'jpg',
        'jpeg',
        'png',
      ],
      size: '2mb',
    }).nullable().optional(),
    industry: vine.string().trim().nullable().optional(),
  }),
}

const UPDATE_DETAILS_VALIDATION_SCHEMA = vine.group([
  vine.group.if(d => d.mode === 'replace', REPLACE_VALIDATION_SCHEMA),
  vine.group.if(d => d.mode === 'partial', PARTIAL_VALIDATION_SCHEMA),
])

const UPDATE_WORKSPACE_DETAILS_SCHEMA = Schema.extend(
  Schema.Struct({
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
  }),
  Schema.Union(
    Schema.Struct({
      mode: Schema.Literal('replace'),
      details: Schema.Struct({
        name: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(3), Schema.maxLength(100)),
        website: Schema.optional(Schema.NullOr(Schema.NonEmptyTrimmedString)),
        logo: Schema.optional(Schema.NullOr(MultipartFileFromSelfSchema)),
        industry: Schema.optional(Schema.NullOr(Schema.NonEmptyTrimmedString)),
      }),
    }),
    Schema.Struct({
      mode: Schema.Literal('partial'),
      details: Schema.Struct({
        name: Schema.optional(Schema.NullOr(Schema.NonEmptyTrimmedString.pipe(Schema.minLength(3), Schema.maxLength(100)))),
        website: Schema.optional(Schema.NullOr(Schema.NonEmptyTrimmedString)),
        logo: Schema.optional(Schema.NullOr(MultipartFileFromSelfSchema)),
        industry: Schema.optional(Schema.NullOr(Schema.NonEmptyTrimmedString)),
      }),
    }),
  ),
)

export default class UpdateWorkspaceDetailsRequestPayload extends DataPayload('modules/workspace/requests/update_workspace_details_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      __params: vine.object({
        id: vine.string().trim().ulid(),
      }),

      mode: vine.enum(['replace', 'partial']),
    }).merge(UPDATE_DETAILS_VALIDATION_SCHEMA),
  ),
  schema: UPDATE_WORKSPACE_DETAILS_SCHEMA,
  mapToSchema: payload => Effect.sync(() => {
    return {
      workspace_identifier: WorkspaceIdentifier.make(payload.__params.id),
      ...(payload.mode === 'replace' ? { mode: payload.mode, details: payload.details } : { mode: payload.mode, details: payload.details }),
    } satisfies typeof UPDATE_WORKSPACE_DETAILS_SCHEMA.Encoded
  }),
}) {}
