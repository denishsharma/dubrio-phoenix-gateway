import InviteUserEmail from '#modules/workspace/mail/invite_user_email'
import mail from '@adonisjs/mail/services/main'
import { Job } from '@rlanz/bull-queue'

export interface SendWorkspaceInviteJobPayload {
  email: string;
  workspaceName: string;
  inviterName: string;
  inviteLink: string;
}

export default class SendWorkspaceInviteJob extends Job {
  static get $$filepath() {
    return import.meta.url
  }

  async handle(payload: SendWorkspaceInviteJobPayload) {
    try {
      // if (app.inProduction) {
      mail.send(new InviteUserEmail(
        payload.email,
        payload.workspaceName,
        payload.inviterName,
        payload.inviteLink,
      ))

      // }
    } catch (error) {
      console.error('Failed to send workspace invite email:', error)
      throw error
    }
  }

  async rescue() {
    // Handle failed jobs
  }
}
