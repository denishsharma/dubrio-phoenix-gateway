import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import { Schema } from 'effect'

export default class ListContactPayload extends DataPayload('modules/contact/payloads/contact_manager/list_contact')({
  kind: DataPayloadKind.DATA,
  schema: Schema.Struct({
    workspace: Schema.Any,
  }),
}) {}
