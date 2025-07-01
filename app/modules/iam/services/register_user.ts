import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user_model'
import SendVerificationLinkJob from '#modules/iam/jobs/send_verification_link_job'
import queue from '@rlanz/bull-queue/services/main'
import { Effect } from 'effect'

export const registerUser = ({ request, response }: HttpContext) => {
  return Effect.gen(function* () {
    const data = request.only([
      'firstName',
      'lastName',
      'email',
      'password',
    ])

    const user = yield* Effect.tryPromise(() =>
      User.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        isVerified: false,
      }),
    )

    yield* Effect.tryPromise(() =>
      queue.dispatch(SendVerificationLinkJob, {
        email: user.email!,
        verificationLink: `http://localhost:3333/verify?email=${user.email}`,
      }),
    )

    response.created({ message: 'User registered successfully', user })
  }).pipe(
    Effect.catchAll(error =>
      Effect.sync(() =>
        response.status(500).send({ message: 'Registration failed', error }),
      ),
    ),
  )
}
