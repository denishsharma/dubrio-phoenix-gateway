import Workspace from '#models/workspace_model'
import factory from '@adonisjs/lucid/factories'

let workspaceCounter = 0

export const WorkspaceFactory = factory
  .define(Workspace, async ({ faker }) => {
    faker.seed(workspaceCounter++)

    const companyName = faker.company.name()
    const slug = faker.helpers.slugify(companyName).toLowerCase()

    return {
      name: companyName,
      slug,
      website: faker.internet.url(),
      logoUrl: faker.image.url(),
      industry: faker.company.buzzNoun(),
    }
  })
  .build()
