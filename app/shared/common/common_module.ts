import HashService from '#shared/common/services/hash_service'
import MaskingService from '#shared/common/services/masking_service'
import ObjectUtilityService from '#shared/common/services/object_utility_service'
import StringMixerService from '#shared/common/services/string_mixer_service'
import { Layer } from 'effect'

export const SHARED_COMMON_MODULE_LAYER = Layer.mergeAll(
  HashService.Default,
  MaskingService.Default,
  StringMixerService.Default,
  ObjectUtilityService.Default,
)
