import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import SendVerificationLinkJob from '#modules/iam/jobs/send_verification_link_job'
import { AccountVerificationService } from '#modules/iam/services/account_verification_service'
import queue from '@rlanz/bull-queue/services/main'

export default class AuthenticationController {
  async register({ request, response }: HttpContext) {
    const data = request.only([
      'firstName',
      'lastName',
      'email',
      'password',
    ])

    const user = await User.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      isVerified: false,
      onboardingStatus: OnboardingStatus.NOT_STARTED,
    })

    if (!user.email) {
      return response.badRequest({ message: 'Email is required' })
    }

    // Dispatch a job to send the verification link

    await AccountVerificationService.queueVerificationEmail(user)

    return response.created({ message: 'User registered successfully', user })
  }

  async verifyCredentials({ request, response, auth }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    const user = await User.verifyCredentials(email, password)

    if (!user.email) {
      return response.badRequest({ message: 'Email is required' })
    }

    if (!user.isVerified) {
      await queue.dispatch(SendVerificationLinkJob, { email: user.email, verificationLink: `http://localhost:3333/verify?email=${user.email}` })
      return response.unauthorized({
        message: `Your account is not verified. A verification link has been sent to ${email}.`,
      })
    }

    await auth.use('web').login(user)

    response.ok({ message: 'Login successful', user })
  }

  async me({ auth, response }: HttpContext) {
    const user = await auth.use('web').user
    return response.ok({ user })
  }
}
