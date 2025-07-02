import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import { AccountVerificationService } from '#modules/iam/services/account_verification_service'

export default class AccountController {
  async verifyAccount({ request, response }: HttpContext) {
    const token = request.input('token')

    const tokenDetails = await AccountVerificationService.verifyToken(token)

    const user = await User.findBy('email', tokenDetails?.email)

    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    user.isVerified = true
    user.onboardingStatus = OnboardingStatus.PENDING
    console.log(`User ${user.email} has been verified.`)
    await user.save()

    return response.redirect('https://www.youtube.com/')
  }
}
