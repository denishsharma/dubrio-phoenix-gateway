import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import VerifyTokenPayload from '#modules/iam/payloads/account_verification/verify_token_payload'
import AccountVerificationService from '#modules/iam/services/account_verification_service'

export default class AccountController {
  protected accountVerification = new AccountVerificationService()

  async verifyAccount({ params, request, response }: HttpContext) {
    const token = params.token
    const key = request.input('k')

    console.log('Verifying account with token:', token, 'and key:', key)

    const tokenDetails = await this.accountVerification.verifyToken(
      VerifyTokenPayload.make({
        token,
        key,
      }),
    )

    const user = await User.findBy('email', tokenDetails?.email)

    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    user.isVerified = true
    user.onboardingStatus = OnboardingStatus.PENDING
    await user.save()

    return response.redirect('https://www.youtube.com/')
  }
}
