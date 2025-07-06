import { BaseMail } from '@adonisjs/mail'

export default class InviteUserEmail extends BaseMail {
  constructor(
    private email: string,
    private workspaceName: string,
    private inviterName: string,
    private inviteLink: string,
  ) {
    super()
  }

  prepare() {
    this.message
      .to(this.email)
      .subject(`You've been invited to join the workspace: ${this.workspaceName}`)
      .html(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Workspace Invitation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Workspace Invitation</h1>
                      <p style="color: #ffffff; margin: 10px 0 0; font-size: 16px; opacity: 0.9;">You've been invited by ${this.inviterName}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hello,</p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        You have been invited to join the workspace <b>${this.workspaceName}</b>.<br>
                        Click the button below to accept the invitation and get started!
                      </p>
                      <table role="presentation" style="margin: 30px 0; display: flex; flex-direction:column; align-items: center; justify-content: center; width: 100%;">
                        <tr>
                          <td align="center" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <a href="${this.inviteLink}"
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
                              Accept Invitation
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                        If you did not expect this invitation, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
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
