import { MultipartFile } from '@adonisjs/core/bodyparser'
import { Schema } from 'effect'

/**
 * Schema that validates instances of MultipartFile
 * from @adonisjs/core/bodyparser.
 *
 * This schema checks if the input is an instance of
 * MultipartFile and has the isMultipartFile property set to true.
 *
 * @see {@link MultipartFile} for more details on the MultipartFile class.
 */
export const MultipartFileFromSelfSchema = Schema.declare(
  (input): input is MultipartFile => input instanceof MultipartFile && input.isMultipartFile,
  {
    identifier: 'MultipartFileFromSelf',
    description: 'MultipartFile instance from @adonisjs/core/bodyparser.',
    message: issue => `[MultipartFileFromSelf:${issue._tag}] The '${issue.actual}' value is not a valid MultipartFile instance from @adonisjs/core/bodyparser.`,
    jsonSchema: {
      type: 'object',
      additionalProperties: false,
    },
  },
)
