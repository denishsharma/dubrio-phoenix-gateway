import { Effect } from 'effect'
import { ulid } from 'ulid'

export default class LucidUtilityService extends Effect.Service<LucidUtilityService>()('@service/core/lucid/utility', {
  effect: Effect.gen(function* () {
    const generateIdentifier = Effect.sync(() => ulid())

    return {
      /**
       * Generates a unique identifier using ULID for Lucid models.
       */
      generateIdentifier,
    }
  }),
}) {}
