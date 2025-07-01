import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const ONBOARDING_STATUS = Enum({
  NOT_STARTED: 'not_started',
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
})

export type OnboardingStatus = InferValue<typeof ONBOARDING_STATUS>
export const OnboardingStatus = ONBOARDING_STATUS.accessor
