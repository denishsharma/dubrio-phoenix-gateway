import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type AddSpaceMemberPayload from '#modules/space/payloads/space_member/add_space_member_payload'
import type CheckSpaceMemberPayload from '#modules/space/payloads/space_member/check_space_member_payload'
import type ListSpaceMembersPayload from '#modules/space/payloads/space_member/list_space_members_payload'
import type RemoveSpaceMemberPayload from '#modules/space/payloads/space_member/remove_space_member_payload'
import DatabaseService from '#core/database/services/database_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import ResourceAlreadyExistsException from '#exceptions/resource_already_exists_exception'
import ResourceNotFoundException from '#exceptions/resource_not_found_exception'
import AuthenticationService from '#modules/iam/services/authentication_service'
import { RetrieveSpaceUsingIdentifier } from '#shared/retrieval_strategies/space_retrieval_strategy'
import { RetrieveUserUsingIdentifier } from '#shared/retrieval_strategies/user_retrieval_strategy'
import { Effect, pipe } from 'effect'

export default class SpaceMemberService extends Effect.Service<SpaceMemberService>()('@service/modules/space/member', {
  dependencies: [
    AuthenticationService.Default,
    DatabaseService.Default,
    ErrorConversionService.Default,
    LucidModelRetrievalService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const errorConversion = yield* ErrorConversionService
    const lucidModelRetrieval = yield* LucidModelRetrievalService
    const telemetry = yield* TelemetryService

    function addMember(payload: ProcessedDataPayload<AddSpaceMemberPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the space using the provided identifier from the payload.
         */
        const space = yield* pipe(
          WithRetrievalStrategy(
            RetrieveSpaceUsingIdentifier,
            retrieve => retrieve(payload.space_identifier),
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
        )

        /**
         * Retrieve the user to be added as a member.
         */
        const userToAdd = yield* pipe(
          WithRetrievalStrategy(
            RetrieveUserUsingIdentifier,
            retrieve => retrieve(payload.user_identifier),
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
        )

        /**
         * Check if the user is already a member of the space.
         */
        const existingMembership = yield* Effect.tryPromise({
          try: () => space
            .related('members')
            .query()
            .where('users.id', userToAdd.id)
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while checking existing membership.'),
        }).pipe(telemetry.withTelemetrySpan('check_existing_space_membership'))

        if (existingMembership) {
          return yield* Effect.fail(
            new ResourceAlreadyExistsException({ data: { resource: 'space_member' } }),
          )
        }

        /**
         * Add the user as a member of the space.
         */
        yield* Effect.tryPromise({
          try: () => space.related('members').attach([userToAdd.id]),
          catch: errorConversion.toUnknownError('Unexpected error occurred while adding the user to the space.'),
        }).pipe(telemetry.withTelemetrySpan('add_user_to_space'))

        /**
         * Return the updated space with members.
         */
        return yield* Effect.tryPromise({
          try: () => space.load('members'),
          catch: errorConversion.toUnknownError('Unexpected error occurred while loading space members.'),
        }).pipe(telemetry.withTelemetrySpan('load_space_members'))
      }).pipe(telemetry.withTelemetrySpan('add_space_member'))
    }

    function removeMember(payload: ProcessedDataPayload<RemoveSpaceMemberPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the space using the provided identifier from the payload.
         */
        const space = yield* pipe(
          WithRetrievalStrategy(
            RetrieveSpaceUsingIdentifier,
            retrieve => retrieve(payload.space_identifier),
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
        )

        /**
         * Retrieve the user to be removed from the space.
         */
        const userToRemove = yield* pipe(
          WithRetrievalStrategy(
            RetrieveUserUsingIdentifier,
            retrieve => retrieve(payload.user_identifier),
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
        )

        /**
         * Check if the user is a member of the space.
         */
        const existingMembership = yield* Effect.tryPromise({
          try: () => space
            .related('members')
            .query()
            .where('users.id', userToRemove.id)
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while checking existing membership.'),
        }).pipe(telemetry.withTelemetrySpan('check_existing_space_membership'))

        if (!existingMembership) {
          return yield* Effect.fail(
            new ResourceNotFoundException({ data: { resource: 'space_member' } }),
          )
        }

        /**
         * Remove the user from the space.
         */
        yield* Effect.tryPromise({
          try: () => space.related('members').detach([userToRemove.id]),
          catch: errorConversion.toUnknownError('Unexpected error occurred while removing the user from the space.'),
        }).pipe(telemetry.withTelemetrySpan('remove_user_from_space'))

        /**
         * Return the updated space.
         */
        return space
      }).pipe(telemetry.withTelemetrySpan('remove_space_member'))
    }

    function listMembers(payload: ProcessedDataPayload<ListSpaceMembersPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the space using the provided identifier from the payload.
         */
        const space = yield* pipe(
          WithRetrievalStrategy(
            RetrieveSpaceUsingIdentifier,
            retrieve => retrieve(payload.space_identifier),
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
        )

        /**
         * List all members of the space.
         */
        return yield* Effect.tryPromise({
          try: () => space
            .related('members')
            .query(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while listing space members.'),
        }).pipe(telemetry.withTelemetrySpan('list_space_members'))
      }).pipe(telemetry.withTelemetrySpan('list_space_members'))
    }

    function checkMember(payload: ProcessedDataPayload<CheckSpaceMemberPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the space using the provided identifier from the payload.
         */
        const space = yield* pipe(
          WithRetrievalStrategy(
            RetrieveSpaceUsingIdentifier,
            retrieve => retrieve(payload.space_identifier),
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
        )

        /**
         * Retrieve the user to check membership for.
         */
        const userToCheck = yield* pipe(
          WithRetrievalStrategy(
            RetrieveUserUsingIdentifier,
            retrieve => retrieve(payload.user_identifier),
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
        )

        /**
         * Check if the user is a member of the space.
         */
        const membership = yield* Effect.tryPromise({
          try: () => space
            .related('members')
            .query()
            .where('users.id', userToCheck.id)
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while checking space membership.'),
        }).pipe(telemetry.withTelemetrySpan('check_space_membership'))

        return {
          isMember: !!membership,
          membership: membership || null,
        }
      }).pipe(telemetry.withTelemetrySpan('check_space_member'))
    }

    return {
      addMember,
      removeMember,
      listMembers,
      checkMember,
    }
  }),
}) {}
