import type { ContactAttributeDataType } from '#constants/contact_attribute_data_type'
import { CONTACT_ATTRIBUTE_DATA_TYPE } from '#constants/contact_attribute_data_type'
import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import Workspace from '#models/workspace_model'
import { ContactAttributeIdentifier } from '#shared/schemas/contact/contact_attributes'
import { Schema } from 'effect'

export default class UpdateContactAttributePayload extends DataPayload('modules/contact/payloads/contact_attribute/update_contact_attribute_payload')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    workspace: SchemaFromLucidModel(Workspace),
    id: SchemaFromLucidModelIdentifier(ContactAttributeIdentifier),
    mode: Schema.Literal('replace', 'patch'),
    data: Schema.Struct({
      name: Schema.optional(Schema.NonEmptyTrimmedString.pipe(Schema.minLength(1), Schema.maxLength(100))),
      data_type: Schema.optional(Schema.Literal(...CONTACT_ATTRIBUTE_DATA_TYPE.values()) as Schema.Schema<ContactAttributeDataType, ContactAttributeDataType>),
      is_required: Schema.optional(Schema.Boolean),
      is_unique: Schema.optional(Schema.Boolean),
      options: Schema.optional(Schema.Array(
        Schema.Struct({
          option_value: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(1), Schema.maxLength(100)),
          option_label: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(1), Schema.maxLength(100)),
        }),
      )),
    }),
  }),
}) {}
