import { ResponseDataMode } from '#core/http/constants/response_data_mode'
import { ResponseType } from '#core/http/constants/response_type'
import { DefaultResponseMetadataDetails } from '#core/http/schemas/response_metadata_schema'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Schema for the standard success response.
 *
 * This schema is used to define the structure of the response
 * when the request is successful and no exceptions occurred.
 */
export default class SuccessResponse extends Schema.Class<SuccessResponse>('@schema/core/http/success_response')({
  type: Schema.Literal(ResponseType.SUCCESS),
  status: Schema.Enums(StatusCodes),
  message: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Unknown),
  metadata: Schema.extend(
    DefaultResponseMetadataDetails,
    Schema.Struct(
      {
        data_mode: Schema.Enums(ResponseDataMode),
      },
      Schema.Record({
        key: Schema.String,
        value: Schema.Unknown,
      }),
    ),
  ),
}) {}
