import ErrorValidationService from '#core/error/services/error_validation_service'
import { Exception as FrameworkException } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'
import { Effect, Match } from 'effect'
import { defaultTo } from 'lodash-es'

export default class ErrorCauseService extends Effect.Service<ErrorCauseService>()('@service/core/error/cause', {
  dependencies: [ErrorValidationService.Default],
  effect: Effect.gen(function* () {
    const errorValidation = yield* ErrorValidationService

    function inferCauseFromError(error: unknown) {
      return Match.value(error).pipe(
        Match.whenOr(
          errorValidation.isInternalError,
          errorValidation.isException,
          err => defaultTo(err.cause, err),
        ),
        Match.whenOr(
          Match.instanceOf(FrameworkException),
          Match.instanceOf(TypeError),
          Match.instanceOf(Error),
          err => defaultTo(is.error(err) ? err.cause as Error : err, err),
        ),
        Match.orElse(() => undefined),
      )
    }

    return {
      /**
       * Infer the cause from the unknown error.
       * If cause cannot be inferred, it returns `undefined`.
       *
       * @param error - The unknown error to infer the cause from.
       */
      inferCauseFromError,
    }
  }),
}) {}
