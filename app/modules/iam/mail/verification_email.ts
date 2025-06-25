import { BaseMail } from '@adonisjs/mail'

export default class VerificationEmail extends BaseMail {
  constructor(private email: string) {
    super()
  }

  prepare() {
    const verifyLink = `http://localhost:3333/verify?email=${this.email}`

    this.message
      .to(this.email)
      .subject('Verify your email')
      .html(`
        <p>Hello,</p>
        <p>Thank you for registering. Please verify your email by clicking the link below:</p>
        <p>
          <a href="${verifyLink}">Verify Email</a>
        </p>
      `)
  }
}
