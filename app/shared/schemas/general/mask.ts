import MaskingService from '#shared/common/services/masking_service'
import { Effect, ParseResult, pipe, Schema } from 'effect'

/**
 * Schema that masks an email address from a string.
 *
 * This schema transforms a string containing an email address
 * into a masked version, where part of the email is replaced
 * with asterisks for privacy.
 *
 * Encoding will not modify the value, but decoding will
 * attempt to mask the email address.
 */
export const MaskEmailFromStringSchema = Schema.asSchema(
  pipe(
    Schema.transformOrFail(
      Schema.String,
      Schema.String,
      {
        strict: true,
        decode: email => Effect.gen(function* () {
          const masking = yield* MaskingService
          return yield* masking.maskEmail(email)
        }).pipe(Effect.provide(MaskingService.Default)),
        encode: ParseResult.succeed,
      },
    ),
    Schema.annotations({
      identifier: 'MaskEmailFromString',
      description: 'Mask email address from string',
      message: issue => `[MaskEmailFromString:${issue._tag}] The '${issue.actual}' value is not a valid email address or cannot be masked.`,
      jsonSchema: {
        type: 'string',
        format: 'email',
        description: 'Email address with masked characters',
      },
    }),
  ),
)
