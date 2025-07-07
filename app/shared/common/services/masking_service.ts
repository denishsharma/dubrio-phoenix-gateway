import { Effect } from 'effect'
import MaskData from 'maskdata'

export default class MaskingService extends Effect.Service<MaskingService>()('@service/shared/common/masking', {
  effect: Effect.gen(function* () {
    function maskEmail(email: string) {
      return Effect.sync(() => MaskData.maskEmail2(email, { unmaskedEndCharactersAfterAt: 255 }))
    }

    return {
      /**
       * Mask the email address by replacing part of it with asterisks,
       * while keeping the last 255 characters visible.
       *
       * @param email - The email address to mask.
       */
      maskEmail,
    }
  }),
}) {}
