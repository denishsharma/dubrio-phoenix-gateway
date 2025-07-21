import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import User from '#models/user_model'
import Workspace from '#models/workspace_model'
import { Schema } from 'effect'

export default class CreateSpacePayload extends DataPayload('modules/space/payloads/space_manager/create_space_payload')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    user: SchemaFromLucidModel(User),
    space: Schema.Struct({
      name: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(3), Schema.maxLength(100)),
      tag: Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(50)),
      icon: Schema.optionalWith(Schema.String, { nullable: true }),
    }),
    workspace: SchemaFromLucidModel(Workspace),
  }),
}) {}
