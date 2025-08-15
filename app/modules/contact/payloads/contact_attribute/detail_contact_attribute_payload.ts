import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import Workspace from '#models/workspace_model'
import { ContactAttributeIdentifier } from '#shared/schemas/contact/contact_attributes'
import { Schema } from 'effect'

export default class DetailContactAttributePayload extends DataPayload('modules/contact/payloads/contact_attribute/detail_contact_attribute_payload')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    workspace: SchemaFromLucidModel(Workspace),
    id: SchemaFromLucidModelIdentifier(ContactAttributeIdentifier),
  }),
}) {}
