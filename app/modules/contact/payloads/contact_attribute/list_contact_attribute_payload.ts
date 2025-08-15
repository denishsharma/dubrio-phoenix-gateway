import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import Workspace from '#models/workspace_model'
import { Schema } from 'effect'

export default class ListContactAttributePayload extends DataPayload('modules/contact/payloads/contact_attribute/list_contact_attribute_payload')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    workspace: SchemaFromLucidModel(Workspace),
  }),
}) {}
