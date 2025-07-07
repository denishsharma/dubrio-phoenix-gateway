import type { WithRetrievalStrategy, WithRetrievalStrategyOptions } from '#core/lucid/constants/with_retrieval_strategy'
import type { LucidModelRetrievalStrategyClass } from '#core/lucid/factories/lucid_model_retrieval_strategy'
import type { LucidModel } from '@adonisjs/lucid/types/model'
import { INTERNALS_MARKER } from '#constants/proto_marker'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import UnknownError from '#core/error/errors/unknown_error'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import ResourceNotFoundException from '#exceptions/resource_not_found_exception'
import is from '@adonisjs/core/helpers/is'
import stringHelpers from '@adonisjs/core/helpers/string'
import { defu } from 'defu'
import { Cause, Effect, Option } from 'effect'
import { defaultTo, omit } from 'lodash-es'

export default class LucidModelRetrievalService extends Effect.Service<LucidModelRetrievalService>()('@service/core/lucid/lucid_model_retrieval', {
  effect: Effect.gen(function* () {
    function retrieve<
      U extends LucidModelRetrievalStrategyClass<any, any, any, any, any, any, any, any>,
      W extends WithRetrievalStrategy<U, any, any, any>,
      H extends true | false | undefined = W extends WithRetrievalStrategy<U, any, any, infer TH> ? TH : undefined,
    >(retrievalStrategy: W) {
      const instance = retrievalStrategy.strategy.make()

      return Effect.gen(function* () {
        const errorConversionService = yield* ErrorConversionService
        const typedEffect = yield* TypedEffectService
        const telemetry = yield* TelemetryService

        const modelName = stringHelpers.singular((instance.model as LucidModel).name)
        const retrieveEffect = retrievalStrategy.method(instance.strategy(omit(retrievalStrategy.options, 'exception'))) as ReturnType<W['method']>

        const options = defu(
          retrievalStrategy.options,
          {
            resource: modelName.toLowerCase(),
            exception: {
              throw: false as H,
              message: instance[INTERNALS_MARKER].exception.message,
            },
          } satisfies Partial<WithRetrievalStrategyOptions<Record<string, unknown>, H>> & { resource: string },
        )

        return yield* Effect.gen(function* () {
          yield* Effect.annotateCurrentSpan('resource', modelName.toLowerCase())

          /**
           * Check if the retrieval method is an effect or not.
           * If not, throw an error.
           */
          if (!Effect.isEffect(retrieveEffect)) {
            return yield* new UnknownError(`The retrieval method must be an effect for the retrieval strategy '${instance._tag}' of model '${modelName}'`)
          }

          /**
           * Retrieve the model instance using the retrieval method
           * and wrap it in an Option.
           */
          const resource = yield* (retrieveEffect as Effect.Effect<Effect.Effect.Success<ReturnType<W['method']>>, Effect.Effect.Error<ReturnType<W['method']>>, Effect.Effect.Context<ReturnType<W['method']>>>).pipe(
            Effect.map(result => ({
              _tag: 'resource' as const,
              resource: result,
            })),
            Effect.catchIf(
              error => Cause.isUnknownException(error),
              error => Effect.succeed(({
                _tag: 'error' as const,
                type: 'unknown_exception' as const,
                error,
              })),
            ),
          )

          if (!options.exception.throw && resource._tag === 'error' && resource.type === 'unknown_exception') {
            return yield* errorConversionService.toUnknownError(`Unknown error occurred while retrieving the ${stringHelpers.pascalCase(stringHelpers.singular(options.resource))} using the retrieval strategy '${instance._tag}'.`)(defaultTo(resource.error.cause, resource.error))
          }

          /**
           * If exception is throwable and resource is not found,
           * throw a ResourceNotFoundException.
           */
          if (options.exception.throw && (resource._tag === 'error' || Option.isNone(Option.fromNullable(resource.resource)))) {
            return yield* new ResourceNotFoundException(
              { data: { resource: stringHelpers.singular(options.resource) } },
              is.function(options.exception.message)
                ? options.exception.message(options.resource)
                : defaultTo(options.exception.message, `${stringHelpers.titleCase(options.resource)} for the provided retrieval strategy '${instance._tag}' does not exist.`),
              {
                cause: resource._tag === 'error' ? defaultTo(resource.error.cause as Error, resource.error) : undefined,
              },
            )
          }

          /**
           * If exception is throwable and resource is found,
           * then return the resource without wrapping it in an Option.
           */
          if (options.exception.throw && resource._tag === 'resource') {
            return resource.resource
          }

          /**
           * If exception is not throwable then return the resource
           * wrapped in an Option regardless of whether it is found or not.
           *
           * This is because the resource is not guaranteed to be found.
           */
          return resource._tag === 'error' ? Option.none() : Option.fromNullable(resource.resource)
        }).pipe(
          typedEffect.overrideSuccessType<H extends true ? NonNullable<Effect.Effect.Success<ReturnType<W['method']>>> : Option.Option<NonNullable<Effect.Effect.Success<ReturnType<W['method']>>>>>(),
          typedEffect.overrideErrorType<H extends true ? Exclude<Effect.Effect.Error<ReturnType<W['method']>>, Cause.UnknownException> | UnknownError | ResourceNotFoundException : Exclude<Effect.Effect.Error<ReturnType<W['method']>>, Cause.UnknownException> | UnknownError>(),
          telemetry.withTelemetrySpan('with_retrieval_strategy', {
            attributes: {
              retrieval_strategy: instance._tag,
              resource: options.resource,
              model: modelName,
            },
          }),
        )
      })
    }

    return {
      /**
       * Retrieves a model resource using the provided retrieval strategy and options
       * while handling exceptions and telemetry.
       *
       * @param retrievalStrategy - The retrieval strategy to use.
       */
      retrieve,
    }
  }),
}) {}
