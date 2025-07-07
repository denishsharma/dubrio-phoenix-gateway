import type { LucidModel } from '@adonisjs/lucid/types/model'
import stringHelpers from '@adonisjs/core/helpers/string'
import { Schema } from 'effect'

/**
 * Creates a schema that validates instances of a Lucid model
 * by checking if the input is an instance of the model.
 *
 * @param model - The Lucid model class to create the schema for.
 */
export default function SchemaFromLucidModel<T extends LucidModel>(model: T) {
  const name = stringHelpers.pascalCase(model.name)
  const tag = `FromLucidModel<${name}>`

  return Schema.declare(
    (input): input is InstanceType<T> => input instanceof model,
    {
      identifier: tag,
      description: `Instance of the ${name} model.`,
      message: issue => `[${tag}:${issue._tag}] The '${issue.actual}' value is not a valid instance of the ${name} model.`,
      jsonSchema: {
        type: 'object',
        additionalProperties: true,
      },
    },
  )
}
