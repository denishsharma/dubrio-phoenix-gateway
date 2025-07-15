import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { SpaceIdentifier } from '#shared/schemas/space/space_attributes'
import { Schema } from 'effect'

export default class RetrieveSpaceDetailsPayload extends DataPayload('modules/space/payloads/space_manager/retrieve_space_details')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    space_identifier: SchemaFromLucidModelIdentifier(SpaceIdentifier),
  }),
}) {}
