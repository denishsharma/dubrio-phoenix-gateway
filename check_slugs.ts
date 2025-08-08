import ContactAttribute from '#models/contact_attribute_model'

async function checkSlugs() {
  try {
    const attributes = await ContactAttribute.query().select('name', 'slug').limit(10)
    // eslint-disable-next-line no-console
    console.log('Contact Attributes with Slugs:')
    // eslint-disable-next-line no-console
    console.table(attributes.map(attr => ({
      name: attr.name,
      slug: attr.slug,
    })))
  } catch (error) {
    console.error('Error:', error.message)
  }
  process.exit(0)
}

checkSlugs()
