import User from '#models/user_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import factory from '@adonisjs/lucid/factories'

let seedCounter = 0

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    faker.seed(seedCounter++)

    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const email = faker.internet.email({
      firstName,
      lastName,
      provider: 'example.com',
    }).toLowerCase()

    return {
      firstName,
      lastName,
      email,
      password: 'password',
      isVerified: false,
      onboardingStatus: OnboardingStatus.NOT_STARTED,
    }
  })
  .build()
