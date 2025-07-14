import is from '@adonisjs/core/helpers/is'
import stringHelpers from '@adonisjs/core/helpers/string'
import { pipe, Schema } from 'effect'

/**
 * Schema that transforms a string to snake case format
 * and ensures it adheres to the snake case pattern.
 *
 * Encoding and decoding will always return the same value,
 * meaning the transformation is not reversible.
 */
export const SnakeCaseStringSchema = Schema.asSchema(
  pipe(
    Schema.transform(
      Schema.String,
      Schema.String,
      {
        strict: true,
        decode: value => stringHelpers.snakeCase(value),
        encode: value => stringHelpers.snakeCase(value),
      },
    ),
    Schema.annotations({
      identifier: 'SnakeCaseString',
      description: 'Transforms a string to snake case.',
      message: issue => `[SnakeCaseString:${issue._tag}] The '${issue.actual}' value is not a type of string or cannot be transformed to snake case.`,
      jsonSchema: {
        type: 'string',
        pattern: '^[a-z0-9_]+$',
      },
    }),
  ),
)

/**
 * Schema that validates a string as a slug representation of itself.
 *
 * A slug is a string that contains only lowercase letters, numbers,
 * and hyphens, ensuring it adheres to the pattern of a slug.
 *
 * This schema checks if the input is a string and if it matches
 * the slug pattern defined by the `stringHelpers.slug` function.
 */
export const SlugFromSelfSchema = Schema.declare(
  (input): input is string => is.string(input) && input === stringHelpers.slug(input),
  {
    identifier: 'SlugFromSelf',
    description: 'Ensures that a string is a slug representation of itself.',
    message: issue => `[SlugFromSelf:${issue._tag}] The '${issue.actual}' value is not a valid slug representation itself.`,
    jsonSchema: {
      type: 'string',
      pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    },
  },
)

/**
 * Schema that transforms a trimmed non-empty string
 * into a slug representation.
 *
 * This transformation ensures that the string is first trimmed
 * and checked for non-emptiness before converting it into a valid slug.
 *
 * Encoding and decoding will always return the same value,
 * meaning the transformation is not reversible.
 */
export const SlugFromStringSchema = Schema.asSchema(
  pipe(
    Schema.transform(
      Schema.NonEmptyTrimmedString,
      SlugFromSelfSchema,
      {
        strict: true,
        decode: value => stringHelpers.slug(value),
        encode: value => stringHelpers.slug(value),
      },
    ),
    Schema.annotations({
      identifier: 'SlugFromString',
      description: 'Transforms a trimmed non-empty string to a slug representation.',
      message: issue => `[SlugFromString:${issue._tag}] The '${issue.actual}' value is not a type of string or cannot be transformed to a slug.`,
      jsonSchema: {
        type: 'string',
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
      },
    }),
  ),
)
