import ApplicationRuntimeService from '#core/effect/services/application_runtime_service'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import { Layer } from 'effect'

export const CORE_EFFECT_MODULE_LAYER = Layer.mergeAll(
  TypedEffectService.Default,
  ApplicationRuntimeService.Default,
)
