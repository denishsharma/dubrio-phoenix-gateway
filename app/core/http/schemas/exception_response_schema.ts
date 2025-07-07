import { ExceptionCode } from '#constants/exception_code'
import { ResponseType } from '#core/http/constants/response_type'
import { DefaultResponseMetadataDetails } from '#core/http/schemas/response_metadata_schema'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Schema for the standard exception response.
 *
 * This schema is used to define the structure of the response
 * when an exception occurs while processing the request.
 */
export default class ExceptionResponse extends Schema.Class<ExceptionResponse>('@schema/core/http/exception_response')({
  type: Schema.Literal(ResponseType.EXCEPTION),
  status: Schema.Enums(StatusCodes),
  message: Schema.String,
  exception: Schema.Enums(ExceptionCode),
  data: Schema.optional(Schema.Unknown),
  metadata: Schema.extend(
    DefaultResponseMetadataDetails,
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
  ),
}) {}
