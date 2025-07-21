import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import User from '#models/user_model'
import { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import { Schema } from 'effect'

export default class ListSpaceMembersPayload extends DataPayload('modules/space/payloads/space_member/list_space_members_payload')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    space_identifier: SchemaFromLucidModelIdentifier(SpaceIdentifier),
    requestingUser: SchemaFromLucidModel(User),
  }),
}) {}
