import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { ContactIdentifier } from '#shared/schemas/contact/contact_attributes'
import { Schema } from 'effect'

export default class UpdateContactPayload extends DataPayload('modules/contact/payloads/contact_manager/update_contact')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Union(
    Schema.Struct({
      workspace: Schema.Any,
      contact_identifier: SchemaFromLucidModelIdentifier(ContactIdentifier),
      mode: Schema.Literal('replace'),
      data: Schema.Struct({
        first_name: Schema.String,
        last_name: Schema.optional(Schema.String),
        email_address: Schema.optional(Schema.String),
        phone_number: Schema.optional(Schema.String),
      }),
    }),
    Schema.Struct({
      workspace: Schema.Any,
      contact_identifier: SchemaFromLucidModelIdentifier(ContactIdentifier),
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
}) {}
