import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import QueueVerificationEmailPayload from '#modules/iam/payloads/account_verification/queue_verification_email_payload'
import AccountVerificationService from '#modules/iam/services/account_verification_service'
import vine from '@vinejs/vine'
import { Duration } from 'effect'

export default class AuthenticationController {
  protected accountVerification = new AccountVerificationService()

  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(vine.compile(
      vine.object({
        first_name: vine.string(),
        last_name: vine.string().optional(),
        email: vine.string().normalizeEmail(),
        password: vine.string().minLength(6),
      }),
    ))

    const user = await User.create({
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      password: data.password,
      isVerified: false,
      onboardingStatus: OnboardingStatus.NOT_STARTED,
    })

    await this.accountVerification.queueVerificationEmail(
      QueueVerificationEmailPayload.make({
        user_identifier: user.uid,
        email: user.email ?? '',
        duration: Duration.seconds(60 * 60 * 2),
      }),
    )

    return response.created({ message: 'User registered successfully' })
  }

  async authenticateWithCredentials({ request, response, auth }: HttpContext) {
    const data = await request.validateUsing(vine.compile(
      vine.object({
        email: vine.string().normalizeEmail(),
        password: vine.string(),
      }),
    ))

    const user = await User.verifyCredentials(data.email, data.password)

    if (!user.isVerified) {
      await this.accountVerification.queueVerificationEmail(
        QueueVerificationEmailPayload.make({
          user_identifier: user.uid,
          email: user.email ?? '',
          duration: Duration.seconds(60 * 60 * 2),
        }),
      )
      return response.unauthorized({
        message: `Your account is not verified. A verification link has been sent to ${data.email}.`,
      })
    }

    await auth.use('web').login(user)

    response.ok({ message: 'Login successful', user })
  }

  async me({ auth, response }: HttpContext) {
    const user = await auth.use('web').user
    return response.ok({ user })
  }

  async handleInvitedUser({ request, response }: HttpContext) {
    console.log('Handling invited user...')
    const data = await request.validateUsing(vine.compile(
      vine.object({
        first_name: vine.string(),
        last_name: vine.string().optional(),
        email: vine.string().normalizeEmail(),
        password: vine.string().minLength(6),
      }),
    ))

    const user = await User.findBy('email', data.email)
    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    user.firstName = data.first_name
    user.lastName = data.last_name || ''
    user.password = data.password
    user.isVerified = true

    await user.save()

    return response.ok({
      message: 'User updated successfully',
    })
  }
}
