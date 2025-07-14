import type { UserModelFields } from '#models/user_model'
import type { WorkspaceMemberRole } from '#modules/workspace/constants/workspace_member_role'
import type { WorkspaceMemberStatus } from '#modules/workspace/constants/workspace_member_status'
import type { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import type { Database } from '@adonisjs/lucid/database'
import { LucidModelRetrievalStrategy } from '#core/lucid/factories/lucid_model_retrieval_strategy'
import SchemaError from '#core/schema/errors/schema_error'
import SchemaFromLucidModel from '#core/schema/utils/schema_from_lucid_model'
import User from '#models/user_model'
import Workspace from '#models/workspace_model'
import WorkspaceMemberDetails from '#modules/workspace/schemas/workspace_member/workspace_member_details_schema'
import { UserIdentifier, UserPrimaryIdentifier } from '#shared/schemas/user/user_attributes'
import is from '@adonisjs/core/helpers/is'
import { Array, Effect, Either, flow, Match, pipe, Record, Schema } from 'effect'
import { DateTime } from 'luxon'

export class RetrieveWorkspaceMembers extends LucidModelRetrievalStrategy('shared/workspace_member/retrieve_workspace_members')()({
  model: Workspace,
  transformed: true,
  strategy: (withStrategy, query) => {
    return (
      workspaceIdentifier: WorkspaceIdentifier,
      memberIdentifiersOrPrimaryIdentifiers: (UserIdentifier | UserPrimaryIdentifier)[],
      select?: '*' | (keyof UserModelFields)[] | Record<string, keyof UserModelFields | (string & {}) | (ReturnType<Database['knexRawQuery']> & {})>,
    ) => withStrategy(
      Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan('workspace_identifier', workspaceIdentifier)

        /**
         * Ensures that the select fields are valid and includes the default 'id' field.
         * This is used to ensure that the query always selects the 'id' field
         * and any other fields that are specified in the options.
         */
        const ensureSelect = Match.value(select).pipe(
          Match.when((_: unknown) => Array.isArray(_), flow(Array.prepend('id'), Array.prepend('uid'), Array.dedupe)),
          Match.when((_: unknown) => is.object(_), flow(Record.set('id', 'id'), Record.set('uid', 'uid'))),
          Match.orElse(() => '*' as const),
        ) as NonNullable<typeof select>

        const workspace = yield* Effect.tryPromise(async () => {
          return await query.preload('members', (q) => {
            q.select(ensureSelect as string)
            if (Array.isNonEmptyArray(memberIdentifiersOrPrimaryIdentifiers)) {
              const [primaryIdentifiers, identifiers] = Array.partitionMap(
                memberIdentifiersOrPrimaryIdentifiers,
                identifier => UserPrimaryIdentifier.is(identifier) ? Either.left(identifier) : Either.right(identifier),
              )

              q.where((builder) => {
                if (Array.isNonEmptyArray(primaryIdentifiers)) {
                  builder.whereIn('id', Array.map(primaryIdentifiers, id => id.value))
                }

                if (Array.isNonEmptyArray(identifiers)) {
                  builder.orWhereIn('uid', Array.map(identifiers, id => id.value))
                }
              })
            }
          }).select(['id']).where(workspaceIdentifier.key, workspaceIdentifier.value).first()
        })

        if (is.nullOrUndefined(workspace)) { return [] }

        return yield* pipe(
          workspace.members,
          Schema.decode(
            Schema.asSchema(
              Schema.transform(
                Schema.Array(SchemaFromLucidModel(User)),
                Schema.Array(
                  Schema.Struct({
                    user: SchemaFromLucidModel(User),
                    ...WorkspaceMemberDetails.fields,
                  }),
                ),
                {
                  strict: true,
                  decode: (users) => {
                    return Array.map(users, (user) => {
                      const invitedBy = user.$extras.pivot_invited_by as string | null | undefined
                      const joinedAt = user.$extras.pivot_joined_at as DateTime | null | undefined
                      const role = user.$extras.pivot_role as WorkspaceMemberRole
                      const status = user.$extras.pivot_status as WorkspaceMemberStatus

                      return {
                        user,
                        invited_by: is.string(invitedBy) ? UserIdentifier.make(invitedBy) : null,
                        joined_at: DateTime.isDateTime(joinedAt) ? joinedAt.toJSDate() : null,
                        role,
                        status,
                      }
                    })
                  },
                  encode: (details) => {
                    return Array.map(details, detail => detail.user)
                  },
                },
              ),
            ),
            { errors: 'all' },
          ),
          SchemaError.fromParseError(`Unexpected error occurred while decoding workspace members for workspace with identifier '${workspaceIdentifier.value}`),
        )
      }),
    )
  },
}) {}
