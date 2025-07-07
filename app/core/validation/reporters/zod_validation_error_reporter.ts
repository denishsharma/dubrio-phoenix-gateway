import type { ErrorReporterContract, FieldContext } from '@vinejs/vine/types'
import type * as z from 'zod/v4'
import is from '@adonisjs/core/helpers/is'
import { errors } from '@vinejs/vine'
import { Array } from 'effect'
import { merge } from 'lodash-es'

export default class ZodValidationErrorReporter implements ErrorReporterContract {
  hasErrors: boolean = false

  issues: z.core.$ZodIssue[] = []

  report(message: string, rule: string, field: FieldContext, meta?: Record<string, any>) {
    this.hasErrors = true

    const paths = Array.fromIterable(field.getFieldPath().split('.'))
    const emptyPath = Array.filter(paths, path => !is.emptyStringOrWhitespace(path)).length === 0

    this.issues.push({
      code: 'custom',
      path: emptyPath ? [] : (paths as unknown as string[]),
      message,
      input: undefined,
      params: merge(
        {
          rule,
          field: {
            name: field.name,
          },
        },
        meta ? { meta } : {},
      ),
    })
  }

  createError() {
    return new errors.E_VALIDATION_ERROR(this.issues)
  }
}
