import ErrorConversionService from '#core/error/services/error_conversion_service'
import { QueueJob } from '#core/queue_job/factories/queue_job'
import VerifyAccountMailNotification from '#modules/iam/notifications/mails/verify_account_mail_notification'
import { AccountVerificationToken } from '#modules/iam/schemas/account/account_attributes'
import MaskingService from '#shared/common/services/masking_service'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import chalk from 'chalk'
import { Effect, pipe, Schema } from 'effect'
import { joinURL, normalizeURL, withQuery } from 'ufo'

export default class SendAccountVerificationEmailJob extends QueueJob('modules/iam/send_account_verification_email', import.meta.url)({
  schema: Schema.Struct({
    email_address: Schema.String,
    token: AccountVerificationToken,
  }),
  handle: payload => Effect.gen(function* () {
    const errorConversion = yield* ErrorConversionService
    const masking = yield* MaskingService

    return yield* Effect.gen(function* () {
      const maskedEmailAddress = yield* masking.maskEmail(payload.email_address)

      /**
       * Construct the verification link for the account verification email.
       * The link includes the token value and key as query parameters.
       */
      const verificationLink = pipe(
        joinURL(env.get('FRONTEND_WEB_URL'), 'account', 'verify', btoa(payload.token.value)),
        url => withQuery(url, { k: payload.token.key }),
        normalizeURL,
      )

      yield* Effect.if(app.inProduction, {
        onFalse: () => Effect.gen(function* () {
          yield* Effect.sleep(2000) // ? Simulate a delay for sending the email in development mode.
          logger.info(`(dev)::[SendAccountVerificationEmailJob]: Mock sending account verification email to ${chalk.red(payload.email_address)} with verification link: ${chalk.yellow(verificationLink)}. [token: ${chalk.blue(payload.token.value)}, key: ${chalk.blue(payload.token.key)}]`)
        }),
        onTrue: () => {
          /**
           * Send the account verification email notification using the AdonisJS mail service.
           */
          return Effect.tryPromise({
            try: async () => {
              return await mail.send(new VerifyAccountMailNotification({
                to: payload.email_address,
                from: 'no-reply@example.com',
                verificationLink,
              }))
            },
            catch: errorConversion.toUnknownError('Unexpected error while sending account verification email notification.', {
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
       * Log a success message indicating that the account verification email was sent.
       */
      yield* Effect.logInfo(`[SendAccountVerificationEmailJob]: Successfully sent account verification email to ${maskedEmailAddress}`)
    })
  }),
}) {}
