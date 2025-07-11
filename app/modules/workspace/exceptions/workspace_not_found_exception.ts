import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { StatusCodes } from 'http-status-codes'

export default class WorkspaceNotFoundException extends Exception('workspace_not_found')({
  status: StatusCodes.NOT_FOUND,
  code: ExceptionCode.E_WORKSPACE_NOT_FOUND,
}) {}
