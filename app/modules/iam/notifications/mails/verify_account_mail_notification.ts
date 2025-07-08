import { Mail } from '#core/mail/factories/mail'
import app from '@adonisjs/core/services/app'
import { Effect, Schema } from 'effect'

export default class VerifyAccountMailNotification extends Mail('modules/iam/notification/mails/verify_account_mail_notification')({
  schema: Schema.Struct({
    to: Schema.String,
    from: Schema.String,
    verificationLink: Schema.String,
  }),
  prepare: (context, payload) => Effect.gen(function* () {
    context.message.to(payload.to)
    context.message.from(payload.from)

    context.message.subject('Verify your account')

    context.message.htmlView(app.makePath('app/modules/iam/resources/views/emails/verify_account_email_html.edge'), payload)
  }),
}) {}
