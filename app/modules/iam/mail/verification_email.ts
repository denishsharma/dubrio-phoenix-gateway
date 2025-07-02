import { BaseMail } from '@adonisjs/mail'

export default class VerificationEmail extends BaseMail {
  constructor(private email: string, private verificationLink: string) {
    super()
  }

  prepare() {
    this.message
      .to(this.email)
      .subject('Verify your email address')
      .html(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome!</h1>
                      <p style="color: #ffffff; margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Please verify your email address</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hello,</p>

                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        Thank you for joining us! To complete your registration and secure your account,
                        please verify your email address by clicking the button below:
                      </p>

                      <!-- Verification Button -->
                      <table role="presentation" style="margin: 30px 0; display: flex; flex-direction:column; align-items: center; justify-content: center; width: 100%;">
                        <tr>
                          <td align="center" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <a href="${this.verificationLink}"
                               style="display: inline-block;
                                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                      color: #ffffff;
                                      text-decoration: none;
                                      padding: 16px 32px;
                                      border-radius: 6px;
                                      display: flex;
                                      flex-direction: column;
                                      align-items: center;
                                      justify-content: center;
                                      font-weight: 600;
                                      font-size: 16px;
                                      transition: transform 0.2s ease;
                                      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);">
                              Verify Email Address
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                        This verification link will expire in 24 hours for security reasons.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #666666; font-size: 14px; margin: 0 0 10px;">
                        If you didn't create an account, please ignore this email.
                      </p>
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        This is an automated message, please do not reply to this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `)
  }
}
