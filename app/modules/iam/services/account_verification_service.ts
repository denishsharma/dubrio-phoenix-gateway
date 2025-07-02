import type User from '#models/user_model'
import type { Duration } from '@adonisjs/cache/types'
import { CacheNameSpace } from '#constants/cache_namespace'
import SendVerificationLinkJob from '#modules/iam/jobs/send_verification_link_job'
import StringMixerService from '#shared/common/services/string_mixer_service'
import cache from '@adonisjs/cache/services/main'
import {} from '@adonisjs/core/helpers'
import queue from '@rlanz/bull-queue/services/main'

// Type for the payload used to generate a token
interface TokenPayload {
  userId: string;
  email: string;
}

// Type for the token details stored in cache
interface TokenDetails {
  userId: string;
  email: string;
  token: string;
  key: string; // Store the key used for decoding
  duration: Duration;
}

const DEFAULT_TOKEN_DURATION_SECONDS = '1D'

export class AccountVerificationService {
  /**
   * Generates a token for account verification and stores it in cache.
   * @param payload - The payload containing userId and email.
   * @param duration - The duration for which the token is valid.
   * @returns A promise that resolves to the token details.
   */
  static async generateTokenDetails(
    payload: TokenPayload,
    duration: Duration = DEFAULT_TOKEN_DURATION_SECONDS,
  ): Promise<TokenDetails> {
    const { value: token, key } = StringMixerService.encode(payload.userId, payload.email)
    const tokenDetails: TokenDetails = {
      userId: payload.userId,
      email: payload.email,
      token,
      key,
      duration,
    }
    // Store in cache by userId (for resend)
    await cache
      .namespace(CacheNameSpace.ACCOUNT_VERIFICATION_TOKEN)
      .set({
        key: payload.userId,
        value: tokenDetails,
        ttl: duration,
      })
    // Store in cache by token (for verification)
    await cache
      .namespace(CacheNameSpace.ACCOUNT_VERIFICATION_TOKEN)
      .set({
        key: token,
        value: tokenDetails,
        ttl: duration,
      })
    return tokenDetails
  }

  /**
   * Queues a verification email for the user.
   * @param user - The user object containing email and uid.
   */
  static async queueVerificationEmail(user: User) {
    if (!user.email) {
      throw new Error('Email is required for verification')
    }

    const cacheKey = `${user.uid}`
    const cacheToken = await cache
      .namespace(CacheNameSpace.ACCOUNT_VERIFICATION_TOKEN)
      .get<TokenDetails | null>({ key: cacheKey })

    let tokenDetails: TokenDetails | null = null

    if (!cacheToken) {
      const payload: TokenPayload = {
        userId: user.uid,
        email: user.email,
      }

      tokenDetails = await AccountVerificationService.generateTokenDetails(payload)
    } else {
      tokenDetails = cacheToken
    }

    console.log(`Token details for user ${user.email}:`, tokenDetails)

    await queue.dispatch(SendVerificationLinkJob, { email: tokenDetails.email, verificationLink: `http://localhost:3333/account/verify?token=${tokenDetails?.token}` })
  }

  static async verifyToken(token: string): Promise<TokenDetails | null> {
    /**
     * ! DELETE THE TOKEN FROM CACHE AFTER USE
     * ! This is important to prevent reuse of the token.
     */

    // Look up the token in cache to get the key and details
    const tokenDetails = await cache
      .namespace(CacheNameSpace.ACCOUNT_VERIFICATION_TOKEN)
      .get<TokenDetails | null>({ key: token })
    if (!tokenDetails) { return null }
    const [userId, email] = StringMixerService.decode(token, tokenDetails.key)
    if (userId !== tokenDetails.userId || email !== tokenDetails.email) {
      return null
    }
    return tokenDetails
  }
}
