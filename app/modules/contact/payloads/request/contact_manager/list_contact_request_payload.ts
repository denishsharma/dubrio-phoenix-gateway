import { FILTER_OPERATORS } from '#constants/filter_operators'
import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import WorkspaceSessionService from '#modules/workspace/services/workspace_session_service'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import vine from '@vinejs/vine'
import { Effect, Match, Schema } from 'effect'

const FilterItem = vine.object({
  attribute: vine.string().trim(),
  operator: vine.enum(FILTER_OPERATORS),
  value: vine.any(),
})

const PaginationItem = vine.object({
  mode: vine.enum(['number', 'next_id']).optional(),

  page: vine.number().min(1).optional().requiredWhen('mode', '=', 'number'),
  per_page: vine.number().min(1).max(100).optional().requiredWhen('mode', '=', 'number'),

  limit: vine.number().min(1).max(100).optional().requiredWhen('mode', '=', 'next_id'),
  next_id: vine.string().trim().ulid().optional().requiredWhen('mode', '=', 'next_id'),
})

const SortItem = vine.object({
  attribute: vine.string().trim(),
  order: vine.enum(['asc', 'desc']),
})

export default class ListContactRequestPayload extends DataPayload('modules/contact/requests/list_contact_request')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      __qs: vine.object({
        workspace_id: vine.string().trim().ulid().optional(),
      }).optional(),
      filters: vine.array(FilterItem).optional(),
      include_attributes: vine.array(vine.string().trim()).optional(),
      exclude_attributes: vine.array(vine.string().trim()).optional(),
      pagination: PaginationItem.optional(),
      sort: vine.array(SortItem).optional(),
    }),
  ),
  schema: Schema.Struct({
    workspace_identifier: SchemaFromLucidModelIdentifier(WorkspaceIdentifier),
    filters: Schema.optional(Schema.Array(Schema.Struct({
      attribute: Schema.NonEmptyTrimmedString,
      operator: Schema.String,
      value: Schema.Any,
    }))),
    include_attributes: Schema.optional(Schema.Array(Schema.NonEmptyTrimmedString)),
    exclude_attributes: Schema.optional(Schema.Array(Schema.NonEmptyTrimmedString)),
    pagination: Schema.optional(Schema.Struct({
      mode: Schema.optional(Schema.Literal('number', 'next_id')),
      page: Schema.optional(Schema.Number),
      per_page: Schema.optional(Schema.Number),
      limit: Schema.optional(Schema.Number),
      next_id: Schema.optional(Schema.String),
    })),
    sort: Schema.optional(Schema.Array(Schema.Struct({
      attribute: Schema.NonEmptyTrimmedString,
      order: Schema.Literal('asc', 'desc'),
    }))),
  }),
  mapToSchema: payload => Effect.gen(function* () {
    const workspaceSessionService = yield* WorkspaceSessionService
    const workspaceIdentifier = yield* Match.value(payload.__qs?.workspace_id).pipe(
      Match.when(Match.defined, id => Effect.succeed(WorkspaceIdentifier.make(id))),
      Match.orElse(() => workspaceSessionService.activeWorkspaceIdentifier),
    )

    return {
      workspace_identifier: workspaceIdentifier,
      filters: payload.filters?.map(filter => ({
        attribute: filter.attribute,
        operator: filter.operator,
        value: filter.value ?? null,
      })),
      include_attributes: payload.include_attributes,
      exclude_attributes: payload.exclude_attributes,
      pagination: payload.pagination
        ? {
            mode: payload.pagination.mode ?? 'number',
            page: payload.pagination.page,
            per_page: payload.pagination.per_page,
            limit: payload.pagination.limit,
            next_id: payload.pagination.next_id,
          }
        : undefined,
      sort: payload.sort?.map(sort => ({
        attribute: sort.attribute,
        order: sort.order,
      })),
    }
  }),
}) {}
