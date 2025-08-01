import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import Workspace from '#models/workspace_model'
import { Schema } from 'effect'

export default class CreateContactPayload extends DataPayload('modules/contact/payloads/contact/create_contact_payload')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    contact: Schema.Struct({
      first_name: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(3), Schema.maxLength(100)),
      last_name: Schema.optional(Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(100))),
      email_address: Schema.optional(Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(100))),
      phone_number: Schema.optional(Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(20))),
    }),
    workspace: SchemaFromLucidModel(Workspace),
  }),
}) {}
