import StorageService from '#shared/storage/services/storage_service'
import { Layer } from 'effect'

export const SHARED_STORAGE_MODULE_LAYER = Layer.mergeAll(
  StorageService.Default,
)
