import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { ContactIdentifier } from '#shared/schemas/contact/contact_attributes'
import { Schema } from 'effect'

export default class RetrieveContactDetailsPayload extends DataPayload('modules/contact/payloads/contact_manager/retrieve_contact_details')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    contact_identifier: SchemaFromLucidModelIdentifier(ContactIdentifier),
    workspace: Schema.Any,
  }),
}) {}
