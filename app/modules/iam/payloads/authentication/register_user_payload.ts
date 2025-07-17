import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import { Schema } from 'effect'

export default class RegisterUserPayload extends DataPayload('modules/iam/authentication/register_user_payload')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    email_address: Schema.NonEmptyTrimmedString,
    password: Schema.Redacted(Schema.NonEmptyTrimmedString),
    first_name: Schema.NonEmptyTrimmedString,
    last_name: Schema.optionalWith(Schema.NonEmptyTrimmedString, { nullable: true }),
  }),
}) {}
