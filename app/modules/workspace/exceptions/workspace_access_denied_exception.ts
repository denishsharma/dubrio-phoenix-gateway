import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { StatusCodes } from 'http-status-codes'

export default class WorkspaceAccessDeniedException extends Exception('workspace_access_denied')({
  status: StatusCodes.FORBIDDEN,
  code: ExceptionCode.E_WORKSPACE_ACCESS_DENIED,
}) {}
