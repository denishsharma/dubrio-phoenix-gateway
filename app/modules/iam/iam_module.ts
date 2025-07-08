import AccountVerificationService from '#modules/iam/services/account_verification_service'
import AuthenticationService from '#modules/iam/services/authentication_service'
import { Layer } from 'effect'

export const IDENTITY_ACCESS_MANAGEMENT_MODULE_LAYER = Layer.mergeAll(
  AuthenticationService.Default,
  AccountVerificationService.Default,
)
