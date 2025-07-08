import { InternalErrorCode } from '#constants/internal_error_code'
import { InternalError } from '#core/error/factories/internal_error'

/**
 * Error occurs when the element that is being accessed does not
 * exist in the data structure.
 *
 * @category Internal Error
 */
export default class NoSuchElementError extends InternalError('no_such_element')({
  code: InternalErrorCode.I_NO_SUCH_ELEMENT,
}) {}
