import type { ContactAttributeDataType } from '#constants/contact_attribute_data_type'
import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import Workspace from '#models/workspace_model'
import { ContactAttributeSlug } from '#shared/schemas/contact/contact_attributes'
import { Schema } from 'effect'

export default class CreateContactAttributePayload extends DataPayload('modules/contact/payloads/contact_attribute/create_contact_attribute_payload')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    name: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(1), Schema.maxLength(100)),
    // Keep literals aligned with ContactAttributeDataType
    data_type: Schema.Literal(
      'string',
      'number',
      'date',
      'boolean',
      'single_choice',
      'multiple_choice',
    ) as Schema.Schema<ContactAttributeDataType, ContactAttributeDataType>,
    is_required: Schema.optional(Schema.Boolean),
    is_unique: Schema.optional(Schema.Boolean),
    slug: SchemaFromSchemaAttribute(ContactAttributeSlug),
    options: Schema.optional(Schema.Array(
      Schema.Struct({
        option_value: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(1), Schema.maxLength(100)),
        option_label: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(1), Schema.maxLength(100)),
      }),
    )),
    workspace: SchemaFromLucidModel(Workspace),
  }),

}) {}
