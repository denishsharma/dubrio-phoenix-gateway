import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import Workspace from '#models/workspace_model'
import { Schema } from 'effect'

export default class ListContactPayload extends DataPayload('modules/contact/payloads/contact_manager/list_contact')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    workspace: SchemaFromLucidModel(Workspace),
    filters: Schema.optional(Schema.Array(Schema.Struct({
      attribute: Schema.NonEmptyTrimmedString,
      operator: Schema.String,
      value: Schema.Any,
    }))),
    include_attributes: Schema.optional(Schema.Array(Schema.NonEmptyTrimmedString)),
    exclude_attributes: Schema.optional(Schema.Array(Schema.NonEmptyTrimmedString)),
    pagination: Schema.Struct({
      mode: Schema.optionalWith(Schema.Literal('number', 'next_id'), { nullable: true }),
      // TODO Use Schema.Union
      page: Schema.optionalWith(Schema.Number, { nullable: true }),
      per_page: Schema.optionalWith(Schema.Number, { nullable: true }),
      limit: Schema.optionalWith(Schema.Number, { nullable: true }),
      next_id: Schema.optionalWith(Schema.String, { nullable: true }),
    }),
    sort: Schema.optional(Schema.Array(Schema.Struct({
      attribute: Schema.NonEmptyTrimmedString,
      order: Schema.Literal('asc', 'desc'),
    }))),
  }),
}) {}
