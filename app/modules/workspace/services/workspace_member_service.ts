import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type AddWorkspaceMemberPayload from '#modules/workspace/payloads/workspace_member/add_workspace_member_payload'
import DatabaseService from '#core/database/services/database_service'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import WorkspaceMemberException from '#modules/workspace/exceptions/workspace_member_exception'
import { RetrieveUserUsingQuery } from '#shared/retrieval_strategies/user_retrieval_strategy'
import { RetrieveWorkspaceMembers } from '#shared/retrieval_strategies/workspace_member_retrieval_strategy'
import { UserIdentifier, UserPrimaryIdentifier } from '#shared/schemas/user/user_attributes'
import { WorkspaceIdentifier } from '#shared/schemas/workspace/workspace_attributes'
import is from '@adonisjs/core/helpers/is'
import { Array, Effect, Either, Option, pipe, Ref } from 'effect'
import { omit } from 'lodash-es'
import { DateTime } from 'luxon'

export default class WorkspaceMemberService extends Effect.Service<WorkspaceMemberService>()('@service/modules/workspace/workspace_member', {
  dependencies: [
    DatabaseService.Default,
    LucidModelRetrievalService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const lucidModelRetrieval = yield* LucidModelRetrievalService
    const telemetry = yield* TelemetryService

    function add(payload: ProcessedDataPayload<AddWorkspaceMemberPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Creates a workspace identifier from the payload.
         * This is used to identify the workspace to which members will be added.
         */
        const workspaceIdentifier = WorkspaceIdentifier.make(payload.workspace.uid)

        /**
         * Reference to store existing members identifiers.
         */
        const existingMembersRef = yield* Ref.make<UserIdentifier[]>([])

        /**
         * Retrieves the workspace members using the provided identifiers.
         * Based on the `existing_members`, it either returns all members or filters them.
         * If `existing_members` is set to 'ignore', it will filter out existing members.
         * If `existing_members` is set to 'strict', it will throw an exception if any members already exist.
         */
        const members = yield* Effect.suspend(() => pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceMembers,
            retrieve => retrieve(
              workspaceIdentifier,
              Array.map(payload.members, member => member.user_identifier_or_primary_identifier),
              ['id', 'uid'],
            ),
            {
              exception: {
                throw: true,
              },
              query: {
                client: trx,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
          Effect.flatMap(existing => Effect.gen(function* () {
            /**
             * If no existing members are found, return the payload members.
             * This means all members are new and can be added.
             */
            if (Array.isEmptyReadonlyArray(existing)) { return payload.members }

            /**
             * If existing members are found, store their identifiers in the reference.
             */
            yield* Ref.set(existingMembersRef, Array.map(existing, member => UserIdentifier.make(member.user.uid)))

            /**
             * If `existing_members` is 'strict' and some existing members are found,
             * return an WorkspaceMemberException.
             */
            if (payload.existing_members === 'strict') {
              /**
               * If some existing members are found, return an WorkspaceMemberException.
               * This means some members already exist in the workspace and cannot be added again.
               */
              return yield* new WorkspaceMemberException(
                {
                  data: {
                    operation: 'add',
                    reason: 'already_exists',
                    workspace_id: workspaceIdentifier.value,
                    data: {
                      existing_members: existing.map(member => member.user.uid),
                    },
                  },
                },
                'Some or all of the members you are trying to add already exist in the workspace.',
              )
            }

            /**
             * If `existing_members` is not set to 'strict', return the payload members.
             * This means existing members can be ignored and new members can be added.
             */
            return Array.filter(payload.members, member => !existing.some(existingMember => existingMember.user.uid === member.user_identifier_or_primary_identifier.value))
          })),

          /**
           * If no existing members are found, return the payload members.
           */
          Effect.catchTag('@error/exception/resource_not_found', () => Effect.succeed(payload.members)),

          /**
           * Ensure that members have their valid primary identifiers.
           * This is because the workspace members are expected to have primary identifiers
           * for database operations.
           */
          Effect.flatMap(filtered => Effect.gen(function* () {
            /**
             * Create partitions of members based on their identifiers.
             * This is done to separate members with primary identifiers from those with regular identifiers.
             *
             * Members with only identifiers will be resolved later
             * using the `RetrieveUserUsingQuery` strategy to ensure they have primary identifiers.
             */
            const [membersWithPrimaryIdentifiers, membersWithIdentifiers] = Array.partitionMap(filtered, (member) => {
              if (UserPrimaryIdentifier.is(member.user_identifier_or_primary_identifier)) {
                return Either.left({
                  ...omit(member, 'user_identifier_or_primary_identifier'),
                  user_primary_identifier: member.user_identifier_or_primary_identifier,
                })
              }
              return Either.right({
                ...omit(member, 'user_identifier_or_primary_identifier'),
                user_identifier: member.user_identifier_or_primary_identifier,
              })
            })

            /**
             * If there are no members with identifiers, return the members with primary identifiers.
             * This means all members already have primary identifiers and can be used directly.
             */
            if (Array.isEmptyReadonlyArray(membersWithIdentifiers)) {
              return membersWithPrimaryIdentifiers
            }

            /**
             * Otherwise, we need to resolve the members with identifiers
             * using the `RetrieveUserUsingQuery` strategy to ensure they have primary identifiers.
             *
             * This is done by querying the database for users
             * based on their identifiers and then mapping them to the members with primary identifiers.
             */
            return yield* pipe(
              WithRetrievalStrategy(
                RetrieveUserUsingQuery,
                retrieve => retrieve('get_users_by_uids')(async (query) => {
                  return await query.whereIn('uid', Array.map(membersWithIdentifiers, member => member.user_identifier.value))
                }),
                {
                  exception: {
                    throw: true,
                  },
                  select: ['uid'],
                  query: { client: trx },
                },
              ),
              lucidModelRetrieval.retrieve,
              Effect.map((users) => {
                return Array.filterMap(membersWithIdentifiers, (member) => {
                  const user = users.find(_ => _.uid === member.user_identifier.value)
                  if (is.nullOrUndefined(user)) { return Option.none() }
                  return Option.some({
                    ...omit(member, 'user_identifier'),
                    user_primary_identifier: UserPrimaryIdentifier.make(user.id),
                  })
                })
              }),
              Effect.map(Array.appendAll(membersWithPrimaryIdentifiers)),
            )
          })),
        )).pipe(telemetry.withTelemetrySpan('ensure_workspace_members'))

        if (!Array.isEmptyReadonlyArray(members)) {
          yield* Effect.tryPromise({
            try: async () => {
              return await payload.workspace.related('members').attach(
                Object.fromEntries(
                  members.map(
                    member => [
                      member.user_primary_identifier.value,
                      {
                        role: member.role,
                        status: member.status,
                        joined_at: DateTime.fromJSDate(member.joined_at),
                      },
                    ],
                  ),
                ),
              )
            },
            catch: WorkspaceMemberException.fromUnknownError(
              {
                operation: 'add',
                reason: 'unknown',
                workspace_id: workspaceIdentifier.value,
              },
              'Unexpected error while adding members to the workspace.',
            ),
          })
        }

        return {
          existing: yield* existingMembersRef.get,
        }
      }).pipe(
        telemetry.withTelemetrySpan('add_workspace_member', {
          attributes: {
            workspace_identifier: payload.workspace.uid,
            members: Array.map(payload.members, member => member.user_identifier_or_primary_identifier.value),
            options: {
              existing_members: payload.existing_members,
            },
          },
        }),
      )
    }

    return {
      /**
       * Add member(s) to a workspace using the provided payload.
       *
       * Based on the `existing_members` option, it either raises an exception if members
       * already exist or ignores them and adds only new members.
       *
       * This function is used to manage workspace membership
       * and ensure that users can be added to workspaces without duplicating existing members.
       *
       * @param payload - The payload containing workspace and member details.
       */
      add,
    }
  }),
}) {}
