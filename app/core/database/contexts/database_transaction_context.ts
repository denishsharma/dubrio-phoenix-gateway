import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { Context, Effect, Layer } from 'effect'

export default class DatabaseTransaction extends Context.Tag('@context/core/database/database_transaction')<DatabaseTransaction, {
  /**
   * The transaction client contract that is used to
   * manage the database transaction.
   */
  readonly trx: TransactionClientContract;
}>() {
  static readonly provide = (trx: TransactionClientContract) => {
    return Layer.effect(
      DatabaseTransaction,
      Effect.gen(function* () {
        return { trx }
      }),
    )
  }
}
