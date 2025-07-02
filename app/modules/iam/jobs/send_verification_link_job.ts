import VerificationEmail from '#modules/iam/mail/verification_email'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import { Job } from '@rlanz/bull-queue'

interface SendVerificationLinkJobPayload {
  email: string;
  verificationLink: string;
}

export default class SendVerificationLinkJob extends Job {
  static get $$filepath() {
    return import.meta.url
  }

  async handle(payload: SendVerificationLinkJobPayload) {
    console.log('Sending verification email to:', payload)
    if (app.inProduction) {
      await mail.send(new VerificationEmail(payload.email, payload.verificationLink))
    }
  }

  async rescue(payload: unknown, error: Error) {
    console.error('Error sending verification email:', error)
    console.error('Payload:', payload)
  }
}
