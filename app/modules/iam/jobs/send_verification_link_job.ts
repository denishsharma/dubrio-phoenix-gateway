import VerificationEmail from '#modules/iam/mail/verification_email'
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
    await mail.send(new VerificationEmail(payload.email))
    // throw new Error('Method not implemented.')
  }

  async rescue(payload: unknown, error: Error) {
    // throw new Error('Method not implemented.')
    console.error('Error sending verification email:', error)
    console.error('Payload:', payload)
  }
}
