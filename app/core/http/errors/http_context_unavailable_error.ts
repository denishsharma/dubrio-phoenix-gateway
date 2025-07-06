import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'

/**
 * Error occurs when the HTTP context is not available in the
 * current scope of execution of the effect.
 *
 * @category Internal Error
 */
export default class HttpContextUnavailableError extends InternalError('http_context_unavailable')({
  code: InternalErrorCode.I_HTTP_CONTEXT_UNAVAILABLE,
}) {}
