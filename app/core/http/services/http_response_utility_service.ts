import type { UnknownRecord } from 'type-fest'
import { ResponseDataMode } from '#core/http/constants/response_data_mode'
import { WithEmptyResponseData } from '#core/http/constants/with_empty_response_data'
import { PaginationResponseMetadataDetails } from '#core/http/schemas/response_metadata_schema'
import SuccessResponse from '#core/http/schemas/success_response_schema'
import SchemaError from '#core/schema/errors/schema_error'
import is from '@adonisjs/core/helpers/is'
import { Effect, Match, pipe, Schema } from 'effect'

export default class HttpResponseUtilityService extends Effect.Service<HttpResponseUtilityService>()('@service/core/http/response_utility', {
  effect: Effect.gen(function* () {
    function inferResponseDataMode(data: unknown) {
      return Match.value(data).pipe(
        Match.withReturnType<ResponseDataMode>(),
        Match.whenOr(
          WithEmptyResponseData.$isWithEmptyResponseData,
          Match.undefined,
          () => ResponseDataMode.EMPTY,
        ),
        Match.when(is.array, () => ResponseDataMode.LIST),
        Match.when(is.object, () => ResponseDataMode.SINGLE),
        Match.orElse(() => ResponseDataMode.RAW),
      )
    }

    function validateResponseMetadata(options: { metadata: UnknownRecord; dataMode: ResponseDataMode }) {
      return pipe(
        Effect.suspend(() =>
          Match.value(options.dataMode).pipe(
            Match.when(
              ResponseDataMode.PAGINATED,
              () => Schema.decodeUnknown(
                Schema.extend(
                  SuccessResponse.fields.metadata,
                  PaginationResponseMetadataDetails,
                ),
                { errors: 'all' },
              )(options.metadata),
            ),
            Match.orElse(() => Schema.decodeUnknown(Schema.Object, { errors: 'all' })(options.metadata)),
          ),
        ),
        SchemaError.fromParseError('Unexpected error occurred while validating the response metadata against the response data mode.', options.metadata),
        Effect.asVoid,
      )
    }

    function validateResponseData(options: { data: unknown; dataMode: ResponseDataMode }) {
      return pipe(
        Effect.suspend(() =>
          Match.value(options.dataMode).pipe(
            Match.when(ResponseDataMode.SINGLE, () => Schema.decodeUnknown(Schema.Object, { errors: 'all' })(options.data)),
            Match.when(ResponseDataMode.EMPTY, () => Schema.decodeUnknown(
              Schema.Union(
                Schema.Undefined,
                Schema.declare(
                  (input): input is WithEmptyResponseData => WithEmptyResponseData.$isWithEmptyResponseData(input),
                  {
                    name: 'WithEmptyResponseDataFromSelf',
                    description: 'A schema that validates a value as WithEmptyResponseData.',
                    jsonSchema: {
                      type: 'object',
                      additionalProperties: true,
                    },
                  },
                ),
              ),
              { errors: 'all' },
            )(options.data)),
            Match.whenOr(
              Match.is(ResponseDataMode.PAGINATED),
              Match.is(ResponseDataMode.LIST),
              () => Schema.decodeUnknown(Schema.Array(Schema.Unknown), { errors: 'all' })(options.data),
            ),
            Match.orElse(() => Schema.decodeUnknown(Schema.Unknown, { errors: 'all' })(options.data)),
          ),
        ),
        SchemaError.fromParseError('Unexpected error occurred while validating the response data against the response data mode.', options.data),
        Effect.asVoid,
      )
    }

    return {
      /**
       * Infer the response data mode based on the given data.
       *
       * This function checks the type of the data and returns the appropriate
       * response data mode to be used in the response.
       *
       * @param data - The data to infer the response data mode from.
       */
      inferResponseDataMode,

      /**
       * Validates the response metadata based on the provided data mode.
       *
       * This function ensures that the metadata structure aligns with the expected
       * format for the specified data mode, preventing inconsistencies and errors.
       *
       * @param options - The options containing metadata and data mode to validate.
       */
      validateResponseMetadata,

      /**
       * Validates the response data based on the provided data mode.
       *
       * This function ensures that the data structure aligns with the expected
       * format for the specified data mode, preventing inconsistencies and errors.
       *
       * @param options - The options containing data and data mode to validate.
       */
      validateResponseData,
    }
  }),
}) {}
