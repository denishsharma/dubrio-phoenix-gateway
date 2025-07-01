import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user_model'

export default class AccountController {
  async verifyAccount({ request, response }: HttpContext) {
    const email = request.input('email')

    const user = await User.findBy('email', email)

    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    user.isVerified = true
    console.log(`User ${user.email} has been verified.`)
    await user.save()

    return response.redirect('https://www.youtube.com/')
  }
}
