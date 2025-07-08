import { LucidModelIdentifierSupport } from '#core/lucid/constants/lucid_model_identifier_support'
import { LucidModelIdentifier } from '#core/lucid/factories/lucid_model_identifier'

export class UserPrimaryIdentifier extends LucidModelIdentifier('shared/schemas/user/user_attributes/user_primary_identifier')({
  marker: Symbol('@marker/shared/schemas/user/user_attributes/user_primary_identifier'),
  support: LucidModelIdentifierSupport.INTEGER_ID_AS_ID,
}) {}

export class UserIdentifier extends LucidModelIdentifier('shared/schemas/user/user_attributes/user_identifier')({
  marker: Symbol('@marker/shared/schemas/user/user_attributes/user_identifier'),
  support: LucidModelIdentifierSupport.ULID_AS_UID,
}) {}
