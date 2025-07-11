import ErrorConversionService from '#core/error/services/error_conversion_service'
import { QueueJob } from '#core/queue_job/factories/queue_job'
import InviteUserEmail from '#modules/workspace/mail/invite_user_email'
import MaskingService from '#shared/common/services/masking_service'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import chalk from 'chalk'
import { Effect, Schema } from 'effect'

export default class SendWorkspaceInviteEmailJob extends QueueJob('modules/workspace/send_workspace_invite_email', import.meta.url)({
  schema: Schema.Struct({
    email: Schema.String,
    workspace_name: Schema.String,
    inviter_name: Schema.String,
    invite_link: Schema.String,
  }),
  handle: payload => Effect.gen(function* () {
    const errorConversion = yield* ErrorConversionService
    const masking = yield* MaskingService

    return yield* Effect.gen(function* () {
      const maskedEmailAddress = yield* masking.maskEmail(payload.email)

      yield* Effect.if(app.inProduction, {
        onFalse: () => Effect.gen(function* () {
          yield* Effect.sleep(2000) // Simulate a delay for sending the email in development mode.
          logger.info(`(dev)::[SendWorkspaceInviteEmailJob]: Mock sending workspace invite email to ${chalk.red(payload.email)} for workspace ${chalk.yellow(payload.workspace_name)} invited by ${chalk.blue(payload.inviter_name)}. Invite link: ${chalk.yellow(payload.invite_link)}`)
        }),
        onTrue: () => {
          /**
           * Send the workspace invite email using the AdonisJS mail service.
           */
          return Effect.tryPromise({
            try: async () => {
              return await mail.send(new InviteUserEmail(
                payload.email,
                payload.workspace_name,
                payload.inviter_name,
                payload.invite_link,
              ))
            },
            catch: errorConversion.toUnknownError('Unexpected error while sending workspace invite email.', {
              context: {
                data: {
                  email_address: maskedEmailAddress,
                  workspace_name: payload.workspace_name,
                  inviter_name: payload.inviter_name,
                },
              },
            }),
          })
        },
      })

      /**
       * Log a success message indicating that the workspace invite email was sent.
       */
      yield* Effect.logInfo(`[SendWorkspaceInviteEmailJob]: Successfully sent workspace invite email to ${maskedEmailAddress} for workspace "${payload.workspace_name}"`)
    })
  }),
}) {}
