import type { VineValidator } from '@vinejs/vine'
import type { Infer, SchemaTypes, ValidationOptions } from '@vinejs/vine/types'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import ValidationException from '#core/validation/exceptions/validation_exception'
import { errors as vineErrors } from '@vinejs/vine'
import { defu } from 'defu'
import { Effect, flow, Match } from 'effect'

/**
 * Options to customize the validation error messages
 * and behavior when validating with Vine.
 */
export type ValidateWithVineOptions<M extends undefined | Record<string, any> = undefined>
  = & {
    /**
     * Exception messages for validation errors.
     */
    exception?: {
      /**
       * Message for the validation error when the value is not valid
       * according to the schema.
       */
      validation?: string;

      /**
       * Message for the unknown error that occurs during validation
       * and could not be classified as a specific error.
       */
      unknown?: string;
    };
  }
  & ([undefined] extends M
    ? {
        /**
         * Validation options for the schema.
         */
        validator?: ValidationOptions<M> | undefined;
      }
    : {
        /**
         * Validation options for the schema.
         */
        validator: ValidationOptions<M>;
      })

export default class VineValidationService extends Effect.Service<VineValidationService>()('@service/core/validation/vine_validation', {
  dependencies: [ErrorConversionService.Default],
  effect: Effect.gen(function* () {
    const errorConversion = yield* ErrorConversionService

    function validate<S extends SchemaTypes, M extends undefined | Record<string, any>>(validator: VineValidator<S, M>, options?: ValidateWithVineOptions<M>) {
      /**
       * @param data - The data to validate against the schema.
       */
      return (data: unknown) => {
        const resolvedOptions = defu(
          options,
          {
            exception: {
              validation: 'Validation error occurred while validating the provided data.',
              unknown: 'Unknown error occurred while validating the provided data.',
            },
            validator: undefined,
          },
        )

        return Effect.tryPromise({
          try: async () => await validator.validate(data, resolvedOptions.validator as any) as Infer<S>,
          catch: flow(
            Match.type<unknown>().pipe(
              Match.when(
                Match.instanceOf(vineErrors.E_VALIDATION_ERROR),
                ValidationException.fromFrameworkException(resolvedOptions.exception.validation),
              ),
              Match.orElse(errorConversion.toUnknownError(resolvedOptions.exception.unknown)),
            ),
          ),
        })
      }
    }

    return {
      /**
       * Validate the given data with the provided Vine schema.
       *
       * @param validator - The Vine schema to validate against.
       * @param options - Options to customize the validation behavior.
       */
      validate,
    }
  }),
}) {}
