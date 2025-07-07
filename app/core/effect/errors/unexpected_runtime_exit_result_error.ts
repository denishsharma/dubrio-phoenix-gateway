import type { InternalErrorOptions } from '#core/error/factories/internal_error'
import type { Exit } from 'effect'
import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'
import { PPOption, PPStringifiedValue } from '@parischap/pretty-print'
import { pipe, Schema } from 'effect'

/**
 * Error occurs when an unexpected runtime exit result is returned
 * from the application runtime and not able to be handled.
 *
 * @category Internal Error
 */
export default class UnexpectedRuntimeExitResultError extends InternalError('unexpected_runtime_exit_result')({
  code: InternalErrorCode.I_UNEXPECTED_RUNTIME_EXIT_RESULT,
  schema: Schema.Struct({
    result: Schema.ExitFromSelf({
      success: Schema.Any,
      defect: Schema.Defect,
      failure: Schema.Any,
    }),
  }),
}) {
  readonly exit: Exit.Exit<any, any>

  constructor(exit: Exit.Exit<any, any>, message?: string, options?: InternalErrorOptions) {
    super({ data: { result: exit } }, message, options)
    this.exit = exit
  }

  override toString() {
    const stringifier = PPOption.toStringifier(PPOption.utilInspectLike)
    return `[UnexpectedRuntimeExitResultError] ${this.message}\n${pipe(stringifier(this.exit), PPStringifiedValue.toAnsiString())}`
  }
}
