import { LucidModelIdentifierSupport } from '#core/lucid/constants/lucid_model_identifier_support'
import { LucidModelIdentifier } from '#core/lucid/factories/lucid_model_identifier'

export class SpacePrimaryIdentifier extends LucidModelIdentifier('shared/schemas/space/space_attributes/space_primary_identifier')({
  marker: Symbol('@marker/shared/schemas/space/space_attributes/space_primary_identifier'),
  support: LucidModelIdentifierSupport.INTEGER_ID_AS_ID,
}) {}

export class SpaceIdentifier extends LucidModelIdentifier('shared/schemas/space/space_attributes/space_identifier')({
  marker: Symbol('@marker/shared/schemas/space/space_attributes/space_identifier'),
  support: LucidModelIdentifierSupport.ULID_AS_UID,
}) {}
