import { SchemaAttribute } from '#core/schema/factories/schema_attribute'
import { pipe, Schema } from 'effect'

export default class WorkspaceInvitationToken extends SchemaAttribute('modules/workspace/workspace_invitation_token')({
  marker: Symbol('@marker/modules/workspace/workspace_invitation_token'),
  schema: Schema.asSchema(
    pipe(
      Schema.Struct({
        value: Schema.String,
        key: Schema.String,
      }),
      Schema.annotations({
        identifier: 'WorkspaceInvitationToken',
        description: 'A token that contains a value and a key for workspace invitation',
        jsonSchema: {
          type: 'object',
          properties: {
            value: { type: 'string', description: 'The token value' },
            key: { type: 'string', description: 'The token key' },
          },
          required: ['value', 'key'],
          additionalProperties: false,
        },
      }),
    ),
  ),
}) {}
