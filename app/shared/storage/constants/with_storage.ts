import type { StorageDestination } from '#shared/storage/constants/storage_destination'
import type { Disk } from '@adonisjs/drive'
import type { DriveDisks } from '@adonisjs/drive/types'
import type { Brand } from 'effect'
import { StorageDisk } from '#shared/storage/constants/storage_disk'
import drive from '@adonisjs/drive/services/main'
import { defaultTo, has } from 'lodash-es'

/**
 * A unique symbol used to mark the `WithStorage` type.
 * This symbol is used to differentiate the `WithStorage` type from tagged enums.
 */
export const WITH_STORAGE: unique symbol = Symbol('@constant/wrapper/shared/storage/with_storage')

/**
 * The shape of the `WithStorage` type used to define the structure
 * of the storage configuration that can be accepted.
 */
export type WithStorage = Brand.Branded<{
  destination: StorageDestination;
  storageDisk: StorageDisk;
  disk: Disk & { readonly provider: Exclude<keyof DriveDisks, undefined> };
}, typeof WITH_STORAGE>

/**
 * Helper function to mark a storage configuration with a unique symbol
 * to differentiate it from other types in runtime checks.
 */
function markWithStorage(destination: WithStorage) {
  return Object.defineProperty(destination, WITH_STORAGE, {
    get() { return WITH_STORAGE },
  }) as WithStorage
}

/**
 * WithStorage is a holder function that represents the different types of storage configurations
 * that can be accepted by the storage service.
 *
 * @param destination - The storage destination to be used.
 * @param storageDisk - The storage disk to be used.
 */
export const WithStorage: {
  (destination: StorageDestination, storageDisk?: StorageDisk): WithStorage;

  /**
   * Check if the given value is of type `WithStorage` by comparing the unique symbol.
   *
   * @param value - The value to check.
   */
  $isWithStorage: (value: unknown) => value is WithStorage;
} = Object.assign(
  (destination: StorageDestination, storageDisk?: StorageDisk) => {
    const storage = markWithStorage({ destination, storageDisk } as WithStorage)
    const resolvedStorageDisk = StorageDisk.$resolveStorageDisk(defaultTo(storageDisk, StorageDisk.default()))

    const disk = drive.use(resolvedStorageDisk)

    return {
      ...storage,
      disk: Object.defineProperty(disk, 'provider', {
        value: resolvedStorageDisk,
        writable: false,
      }) as unknown as typeof disk & { readonly provider: Exclude<typeof resolvedStorageDisk, undefined> },
    } as WithStorage
  },
  {
    $isWithStorage: (value: unknown): value is WithStorage => {
      return has(value, WITH_STORAGE) && value[WITH_STORAGE] === WITH_STORAGE
    },
  },
)
