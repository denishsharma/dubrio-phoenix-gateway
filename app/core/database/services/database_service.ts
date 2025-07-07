import type { IsolationLevels, TransactionClientContract } from '@adonisjs/lucid/types/database'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseTransactionError from '#core/database/errors/database_transaction_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import db from '@adonisjs/lucid/services/db'
import { Effect, Exit } from 'effect'

/**
 * The options to create a database transaction.
 */
export interface DatabaseTransactionOptions {
  isolationLevel?: IsolationLevels;
}

export default class DatabaseService extends Effect.Service<DatabaseService>()('@service/core/database', {
  dependencies: [TelemetryService.Default],
  effect: Effect.gen(function* () {
    const telemetry = yield* TelemetryService

    function createTransaction(options?: DatabaseTransactionOptions) {
      return Effect.gen(function* () {
        return yield* Effect.tryPromise({
          try: async () => await db.transaction(options),
          catch: DatabaseTransactionError.fromUnknownError('create', 'Unexpected error occurred while creating a database transaction.'),
        })
      }).pipe(telemetry.withTelemetrySpan('database_transaction_create'))
    }

    function requireTransaction() {
      return Effect.gen(function* () {
        const { trx } = yield* DatabaseTransaction

        /**
         * Finalizer to commit or rollback the transaction based on the current
         * execution exit status.
         */
        yield* Effect.addFinalizer(
          Exit.matchEffect({
            onFailure: () => Effect.gen(function* () {
              yield* Effect.logWarning('Rolling back the database transaction due to some failure.')
              yield* Effect.annotateCurrentSpan('database_transaction', 'rollback ')
              yield* Effect.tryPromise(async () => await trx.rollback())
            }).pipe(Effect.ignore),
            onSuccess: () => Effect.gen(function* () {
              yield* Effect.annotateCurrentSpan('database_transaction', 'commit')
              yield* Effect.tryPromise(async () => await trx.commit())
            }).pipe(Effect.ignore),
          }),
        )

        function savepoint(client: TransactionClientContract = trx, transactionOptions?: DatabaseTransactionOptions) {
          return Effect.tryPromise({
            try: async () => await client.transaction(transactionOptions),
            catch: DatabaseTransactionError.fromUnknownError('savepoint', 'Unexpected error occurred while creating a database transaction savepoint.'),
          }).pipe(telemetry.withTelemetrySpan('database_transaction_savepoint'))
        }

        function commit(client: TransactionClientContract = trx) {
          return Effect.tryPromise({
            try: async () => await client.commit(),
            catch: DatabaseTransactionError.fromUnknownError('commit', 'Unexpected error occurred while committing the database transaction.'),
          }).pipe(telemetry.withTelemetrySpan('database_transaction_commit'))
        }

        function rollback(client: TransactionClientContract = trx) {
          return Effect.tryPromise({
            try: async () => await client.rollback(),
            catch: DatabaseTransactionError.fromUnknownError('rollback', 'Unexpected error occurred while rolling back the database transaction.'),
          }).pipe(telemetry.withTelemetrySpan('database_transaction_rollback'))
        }

        return {
          /**
           * The active transaction client.
           * This should be used to perform database operations within the transaction.
           */
          trx,

          /**
           * Create a savepoint in the current transaction.
           * This allows you to rollback to this point without rolling back the entire transaction.
           *
           * @param client - The transaction client to use.
           * @param options - The options for the transaction.
           */
          savepoint,

          /**
           * Commit the current transaction, persisting all changes made within it.
           *
           * Calling this manually is optional, as the transaction will be committed
           * automatically when the current execution exits successfully.
           *
           * @param client - The transaction client to use.
           */
          commit,

          /**
           * Rollback the current transaction, discarding all changes made within it.
           *
           * Calling this manually is optional, as the transaction will be rolled back
           * automatically when the current execution exits with a failure.
           *
           * @param client - The transaction client to use.
           */
          rollback,
        }
      })
    }

    return {
      /**
       * Create a new database transaction, allowing you to perform multiple
       * database operations within a single transaction.
       *
       * This is used when you want to pass a transaction client to other services
       * or perform operations that require a transaction context.
       */
      createTransaction,

      /**
       * Require an existing database transaction to be active.
       * This is useful when you want to perform operations within an existing transaction
       * that has been created using `createTransaction`.
       *
       * It ensures that the operations are performed within the context of the existing transaction.
       */
      requireTransaction,
    }
  }),
}) {}
