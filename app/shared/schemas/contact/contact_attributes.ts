import { LucidModelIdentifierSupport } from '#core/lucid/constants/lucid_model_identifier_support'
import { LucidModelIdentifier } from '#core/lucid/factories/lucid_model_identifier'
import { SchemaAttribute } from '#core/schema/factories/schema_attribute'
import { SlugFromStringSchema } from '#shared/schemas/general/string'

export class ContactPrimaryIdentifier extends LucidModelIdentifier('shared/schemas/contact/contact_attributes/contact_primary_identifier')({
  marker: Symbol('@marker/shared/schemas/contact/contact_attributes/contact_primary_identifier'),
  support: LucidModelIdentifierSupport.INTEGER_ID_AS_ID,
}) {}

export class ContactIdentifier extends LucidModelIdentifier('shared/schemas/contact/contact_attributes/contact_identifier')({
  marker: Symbol('@marker/shared/schemas/contact/contact_attributes/contact_identifier'),
  support: LucidModelIdentifierSupport.ULID_AS_UID,
}) {}

export class ContactAttributeSlug extends SchemaAttribute('shared/schemas/contact/contact_attributes/contact_attribute_slug')({
  marker: Symbol('@marker/shared/schemas/contact/contact_attributes/contact_attribute_slug'),
  schema: SlugFromStringSchema,
}) {}
