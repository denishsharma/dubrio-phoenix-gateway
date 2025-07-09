import { Mail } from '#core/mail/factories/mail'
import app from '@adonisjs/core/services/app'
import { Effect, Schema } from 'effect'

export default class PasswordResetMailNotification extends Mail('modules/iam/notification/mails/password_reset_mail_notification')({
  schema: Schema.Struct({
    to: Schema.String,
    from: Schema.String,
    resetLink: Schema.String,
  }),
  prepare: (context, payload) => Effect.gen(function* () {
    context.message.to(payload.to)
    context.message.from(payload.from)

    context.message.subject('Reset your password')

    context.message.htmlView(app.makePath('app/modules/iam/resources/views/emails/password_reset_email_html.edge'), payload)
  }),
}) {}
