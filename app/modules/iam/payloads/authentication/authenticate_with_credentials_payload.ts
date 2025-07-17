import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import { Schema } from 'effect'

export default class AuthenticateWithCredentialsPayload extends DataPayload('modules/iam/authentication/authenticate_with_credentials')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    email_address: Schema.NonEmptyTrimmedString,
    password: Schema.Redacted(Schema.NonEmptyTrimmedString),
  }),
}) {}
