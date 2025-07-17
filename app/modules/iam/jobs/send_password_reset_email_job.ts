import ErrorConversionService from '#core/error/services/error_conversion_service'
import { QueueJob } from '#core/queue_job/factories/queue_job'
import PasswordResetMailNotification from '#modules/iam/notifications/mails/password_reset_mail_notification'
import PasswordResetToken from '#modules/iam/schemas/authentication/password_reset_token'
import MaskingService from '#shared/common/services/masking_service'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import chalk from 'chalk'
import { Effect, pipe, Schema } from 'effect'
import prettyMs from 'pretty-ms'
import { joinURL, normalizeURL, withQuery } from 'ufo'

export default class SendPasswordResetEmailJob extends QueueJob('modules/iam/send_password_reset_email', import.meta.url)({
  schema: Schema.Struct({
    email_address: Schema.String,
    token: PasswordResetToken.schema,
    expires_in_millis: Schema.Positive,
  }),
  handle: payload => Effect.gen(function* () {
    const errorConversion = yield* ErrorConversionService
    const masking = yield* MaskingService

    return yield* Effect.gen(function* () {
      const maskedEmailAddress = yield* masking.maskEmail(payload.email_address)

      /**
       * Construct the password reset link for the password reset email.
       * The link includes the token value and key as query parameters.
       */
      const resetLink = pipe(
        joinURL(env.get('FRONTEND_WEB_URL'), 'auth', 'reset-password', btoa(payload.token.value)),
        url => withQuery(url, { k: payload.token.key }),
        normalizeURL,
      )

      yield* Effect.if(app.inProduction, {
        onFalse: () => Effect.gen(function* () {
          yield* Effect.sleep(2000) // ? Simulate a delay for sending the email in development mode.
          logger.info(`(dev)::[SendPasswordResetEmailJob]: Mock sending password reset email to ${chalk.red(payload.email_address)} with reset link: ${chalk.yellow(resetLink)}. [token: ${chalk.blue(payload.token.value)}, key: ${chalk.blue(payload.token.key)}]`)
        }),
        onTrue: () => {
          /**
           * Send the password reset email notification using the AdonisJS mail service.
           */
          return Effect.tryPromise({
            try: async () => {
              return await mail.send(new PasswordResetMailNotification({
                to: payload.email_address,
                from: 'no-reply@example.com',
                reset_link: resetLink,
                formatted_expiration: prettyMs(payload.expires_in_millis, { verbose: true }),
              }))
            },
            catch: errorConversion.toUnknownError('Unexpected error while sending password reset email notification.', {
              context: {
                data: {
                  email_address: maskedEmailAddress,
                },
              },
            }),
          })
        },
      })

      /**
       * Log a success message indicating that the password reset email was sent.
       */
      yield* Effect.logInfo(`[SendPasswordResetEmailJob]: Successfully sent password reset email to ${maskedEmailAddress}`)
    })
  }),
}) {}
