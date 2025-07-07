import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import vine from '@vinejs/vine'
import { Schema } from 'effect'

const ACCEPT_VALIDATION_SCHEMA = {
  mode: vine.literal('accept'),
}

const REGISTER_VALIDATION_SCHEMA = {
  mode: vine.literal('register'),
  first_name: vine.string().trim().minLength(3),
  last_name: vine.string().trim().optional(),
  password: vine.string().trim().minLength(8).maxLength(64).confirmed({
    confirmationField: 'confirm_password',
  }),
}

const LOGIN_VALIDATION_SCHEMA = {
  mode: vine.literal('login'),
  password: vine.string().trim(),
}

const INVITATION_MODE_VALIDATION_SCHEMA = vine.group([
  vine.group.if(data => data.mode === 'accept', ACCEPT_VALIDATION_SCHEMA),
  vine.group.if(data => data.mode === 'register', REGISTER_VALIDATION_SCHEMA),
  vine.group.if(data => data.mode === 'login', LOGIN_VALIDATION_SCHEMA),
])

export default class AcceptWorkspaceInvitePayload extends DataPayload('modules/workspace/accept_workspace_invite')({
  kind: DataPayloadKind.REQUEST,
  validator: vine.compile(
    vine.object({
      token: vine.object({
        value: vine.string(),
        key: vine.string(),
      }),
      mode: vine.enum([
        'accept',
        'register',
        'login',
      ]),
    }).merge(INVITATION_MODE_VALIDATION_SCHEMA),
  ),
  schema: Schema.extend(
    Schema.Struct({
      token: Schema.Struct({
        value: Schema.String,
        key: Schema.String,
      }),
    }),
    Schema.Union(
      Schema.Struct({
        mode: Schema.Literal('accept'),
      }),
      Schema.Struct({
        mode: Schema.Literal('register'),
        first_name: Schema.NonEmptyTrimmedString,
        last_name: Schema.optional(Schema.NonEmptyTrimmedString),
        password: Schema.Redacted(Schema.NonEmptyTrimmedString),
      }),
      Schema.Struct({
        mode: Schema.Literal('login'),
        password: Schema.Redacted(Schema.NonEmptyTrimmedString),
      }),
    ),
  ),
}) {}
