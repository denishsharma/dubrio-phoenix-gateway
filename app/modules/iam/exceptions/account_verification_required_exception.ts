import { ExceptionCode } from '#constants/exception_code'
import { Exception } from '#core/error/factories/exception'
import SchemaFromLucidModelIdentifier from '#core/schema/utils/schema_from_lucid_model_identifier'
import { UserIdentifier } from '#shared/schemas/user/user_attributes'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when the user account requires verification before accessing certain
 * resources or performing specific actions.
 *
 * @category Exception
 */
export default class AccountVerificationRequiredException extends Exception('account_verification_required')({
  status: StatusCodes.UNAUTHORIZED,
  code: ExceptionCode.E_ACCOUNT_VERIFICATION_REQUIRED,
  schema: Schema.Struct({
    user_identifier: SchemaFromLucidModelIdentifier(UserIdentifier),
    email_address: Schema.NonEmptyTrimmedString,
  }),
}) {}
