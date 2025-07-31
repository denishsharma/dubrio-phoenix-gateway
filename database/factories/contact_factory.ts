import Contact from '#models/contact_model'
import factory from '@adonisjs/lucid/factories'

let contactCounter = 0

export const ContactFactory = factory
  .define(Contact, async ({ faker }) => {
    faker.seed(contactCounter++)

    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const email = faker.internet.email({
      firstName,
      lastName,
      provider: 'example.com',
    }).toLowerCase()

    return {
      firstName,
      lastName,
      email,
      phoneNumber: faker.phone.number(),
      workspaceId: 1,
    }
  })
  .build()
