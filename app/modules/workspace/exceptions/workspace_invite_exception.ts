import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import { StatusCodes } from 'http-status-codes'

export default class WorkspaceInviteException extends Exception('workspace_invite')({
  status: StatusCodes.BAD_REQUEST,
  code: ExceptionCode.E_WORKSPACE_INVITE,
}) {}
