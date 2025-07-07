import type { R } from '#core/effect/types/application_runtime'
import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import type { Merge } from 'type-fest'
import UnexpectedRuntimeExitResultError from '#core/effect/errors/unexpected_runtime_exit_result_error'
import ApplicationRuntimeService from '#core/effect/services/application_runtime_service'
import InternalServerException from '#core/error/exceptions/internal_server_exception'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import HttpContext from '#core/http/contexts/http_context'
import { ApplicationRuntime } from '#start/runtime'
import { Cause, Effect, Exit } from 'effect'

/**
 * Handles the runtime exit result and returns the value if the exit result
 * is successful. If the exit result is a failure, it throws the error.
 *
 * If the exit result is a defect, it throws an internal server exception.
 */
function handleExitResult<A, E>(exit: Exit.Exit<A, E>) {
  if (Exit.isFailure(exit) && Cause.isFailType(exit.cause)) {
    throw exit.cause.error
  }

  if (Exit.isFailure(exit) && Cause.isDieType(exit.cause)) {
    throw ErrorConversionService.use(_ => _.toInternalServerException()((exit.cause as Cause.Die).defect)).pipe(
      Effect.catchTag('@error/exception/internal_server', error => Effect.succeed(error)),
      ApplicationRuntime.runSync,
    )
  }

  if (Exit.isSuccess(exit)) {
    return exit.value
  }

  const unhandled = new UnexpectedRuntimeExitResultError(exit)
  console.error(unhandled.toString())
  throw new InternalServerException(unhandled)
}

interface RuntimeExecutionOptions {
  ctx?: FrameworkHttpContext;
}

/**
 * Runs the effect and returns a promise that resolves to the value of the effect.
 *
 * @param options - The options for the runtime execution.
 */
function runPromise<A, E>(options?: Merge<RuntimeExecutionOptions, { signal?: AbortSignal }>) {
  return async (self: Effect.Effect<A, E, R>): Promise<A> => {
    const result = await ApplicationRuntime.runPromiseExit(
      Effect.gen(function* () {
        const runtime = yield* ApplicationRuntimeService
        return yield* runtime.managedEffect(self).pipe(
          Effect.provide(HttpContext.provide(options?.ctx)),
        )
      }),
      {
        signal: options?.signal,
      },
    )
    return handleExitResult(result)
  }
}

/**
 * Runs the effect and returns the value of the effect.
 *
 * @param options - The options for the runtime execution.
 */
function runSync<A, E>(options?: RuntimeExecutionOptions) {
  return (self: Effect.Effect<A, E, R>): A => {
    const result = ApplicationRuntime.runSyncExit(
      Effect.gen(function* () {
        const runtime = yield* ApplicationRuntimeService
        return yield* runtime.managedEffect(self).pipe(
          Effect.provide(HttpContext.provide(options?.ctx)),
        )
      }),
    )
    return handleExitResult(result)
  }
}

const ApplicationRuntimeExecution = {
  handleExitResult,
  runPromise,
  runSync,
}

export default ApplicationRuntimeExecution
