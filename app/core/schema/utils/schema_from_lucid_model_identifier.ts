import type { LucidModelIdentifierClass } from '#core/lucid/factories/lucid_model_identifier'
import { Schema } from 'effect'

/**
 * Creates a schema that validates instances of a Lucid model identifier
 * by checking if the input is an instance of the identifier class.
 *
 * @param identifier - The Lucid model identifier class to create the schema for.
 */
export default function SchemaFromLucidModelIdentifier<U extends LucidModelIdentifierClass<any, any, any>>(identifier: U) {
  const name = identifier._tag
  const tag = `FromLucidModelIdentifier<${name}>`

  return Schema.declare(
    (input): input is InstanceType<U> => identifier.is(input),
    {
      identifier: tag,
      description: `Instance of the Lucid model identifier '${name}'.`,
      message: issue => `[${tag}:${issue._tag}] The '${issue.actual}' value is not a valid instance of the Lucid model identifier '${name}'.`,
      jsonSchema: {
        type: 'object',
        additionalProperties: true,
      },
    },
  )
}
