import { DataPayloadKind } from '#core/data_payload/constants/data_payload_kind'
import { DataPayload } from '#core/data_payload/factories/data_payload'
import SchemaFromSchemaAttribute from '#core/schema/utils/schema_from_schema_attribute'
import WorkspaceInvitationToken from '#modules/workspace/schemas/workspace_member/workspace_invitation_token'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

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

export default class AcceptWorkspaceInvitationRequestPayload extends DataPayload('modules/workspace/workspace_invitation/accept_workspace_invitation_request')({
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
      token: SchemaFromSchemaAttribute(WorkspaceInvitationToken),
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
  mapToSchema: payload => Effect.gen(function* () {
    const token = yield* WorkspaceInvitationToken.make(payload.token)
    if (payload.mode === 'accept') {
      return { token, mode: payload.mode }
    }
    if (payload.mode === 'register') {
      return {
        token,
        mode: payload.mode,
        first_name: payload.first_name,
        last_name: payload.last_name,
        password: payload.password,
      }
    }
    if (payload.mode === 'login') {
      return {
        token,
        mode: payload.mode,
        password: payload.password,
      }
    }
    throw new Error('Invalid mode in AcceptWorkspaceInvitePayload.mapToSchema')
  }),
}) {}
