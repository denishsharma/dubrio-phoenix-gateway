import type { Jsonifiable, SnakeCasedPropertiesDeep } from 'type-fest'
import { DataSource } from '#constants/data_source'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import SchemaError from '#core/schema/errors/schema_error'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import ObjectUtilityService from '#shared/common/services/object_utility_service'
import is from '@adonisjs/core/helpers/is'
import stringHelpers from '@adonisjs/core/helpers/string'
import { Effect, pipe, Schema } from 'effect'

/**
 * Type that ensures the response schema is valid for encoding.
 *
 * It checks that the schema is a valid Effect Schema and that the
 * decoded type is JSON serializable (extends Jsonifiable).
 */
type ValidResponseSchema<A, I, R>
  = & Schema.Schema<A, I, R>
    & (A extends Jsonifiable ? unknown : { __error__: 'Schema must be decoded to a type that is JSON serializable for the response encoder and extends Jsonifiable' })

/**
 * UsingResponseEncoder is a utility function that takes a response schema
 * and DataSource that represents the response data.
 *
 * It decodes the response data using the provided schema and returns
 * the JSON-serializable encoded response which can be used in HTTP responses.
 *
 * @param schema - The schema to decode the response data.
 */
export default function UsingResponseEncoder<A, I, R>(schema: ValidResponseSchema<A, I, R>) {
  /**
   * @param source - The DataSource that contains the response data to be encoded.
   */
  return (source: DataSource<I>) => {
    return Effect.gen(function* () {
      const objectUtility = yield* ObjectUtilityService
      const typedEffect = yield* TypedEffectService
      const telemetry = yield* TelemetryService

      /**
       * Resolve the DataSource to get the response data.
       */
      const responseData = yield* DataSource.$resolveDataSource(source)

      return yield* Effect.suspend(() =>
        pipe(
          responseData,
          Schema.decode(schema, { errors: 'all' }),
          SchemaError.fromParseError('Unexpected error while decoding response data using response encoder.'),

          /**
           * Rename keys of the response data to snake_case.
           */
          Effect.map((data) => {
            if (is.object(data)) { return objectUtility.renameKeysWithMapper(data, stringHelpers.snakeCase) }
            return data
          }),

          /**
           * Ensure the return type is of A and then override it to
           * SnakeCasedPropertiesDeep<A> if A is an object.
           *
           * This is necessary to ensure that the response data
           * is in the correct format for the response encoder.
           */
          typedEffect.ensureSuccessType<A>(),
          typedEffect.overrideSuccessType<A extends object ? SnakeCasedPropertiesDeep<A> : A>(),
        ),
      ).pipe(telemetry.withTelemetrySpan('encode_response'))
    })
  }
}
