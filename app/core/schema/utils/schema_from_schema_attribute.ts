import type { SchemaAttributeClass } from '#core/schema/factories/schema_attribute'
import { TAG_MARKER } from '#constants/proto_marker'
import { Schema } from 'effect'

/**
 * Creates a schema that validates instances of a schema attribute
 * by checking if the input is an instance of the attribute class.
 *
 * @param attribute - The schema attribute class to create the schema for.
 */
export default function SchemaFromSchemaAttribute<U extends SchemaAttributeClass<any, any, any, any, any>>(attribute: U) {
  const name = attribute[TAG_MARKER]
  const tag = `FromSchemaAttribute<${name}>`

  return Schema.declare(
    (input): input is InstanceType<U> => attribute.is(input),
    {
      identifier: tag,
      description: `Instance of the schema attribute '${name}'.`,
      message: issue => `[${tag}:${issue._tag}] The '${issue.actual}' value is not a valid instance of the schema attribute '${name}'.`,
      jsonSchema: {
        type: 'object',
        additionalProperties: true,
      },
    },
  )
}
