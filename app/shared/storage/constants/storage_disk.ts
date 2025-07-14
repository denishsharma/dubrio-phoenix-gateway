import type { TaggedEnum } from '#types/tagged_enum'
import type { DriveDisks } from '@adonisjs/drive/types'
import env from '#start/env'
import is from '@adonisjs/core/helpers/is'
import { Option, pipe } from 'effect'
import { has } from 'lodash-es'

/**
 * A unique symbol used to mark the `StorageDisk` type.
 * This symbol is used to differentiate the `StorageDisk` type from tagged enums.
 */
export const STORAGE_DISK_MARKER: unique symbol = Symbol('@constant/enum/shared/storage/storage_disk')

/**
 * The shape of the `StorageDisk` type used to define the structure
 * of the storage disk that can be accepted.
 */
export interface StorageDiskShape {
  default: { disk: keyof DriveDisks };
  fs: { disk: keyof DriveDisks };
  public: { disk: keyof DriveDisks };
}

/**
 * The `StorageDisk` type is a tagged enum that represents the different
 * types of storage disks that can be accepted.
 */
export type StorageDisk = TaggedEnum<StorageDiskShape, typeof STORAGE_DISK_MARKER>

/**
 * Helper function to mark a storage disk with a unique symbol
 */
function markStorageDisk(disk: StorageDisk) {
  return Object.defineProperty(disk, STORAGE_DISK_MARKER, {
    get() { return STORAGE_DISK_MARKER },
  }) as StorageDisk
}

/**
 * StorageDisk is a tagged enum that represents the different types of storage disks
 * that can be accepted.
 *
 * It is a holder for various storage disks, such as fs, blackblaze, and public, etc.
 */
export const StorageDisk = {
  /**
   * The storage disk is the default disk that is used by the application.
   */
  default: () => markStorageDisk({ disk: env.get('DRIVE_DISK'), _tag: 'default' } as StorageDisk),

  /**
   * The storage disk is a file system disk that stores files locally
   * on the server.
   */
  fs: () => markStorageDisk({ disk: 'fs', _tag: 'fs' } as StorageDisk),

  /**
   * The storage disk is a public disk that stores files publicly
   * on the server.
   */
  public: () => markStorageDisk({ disk: 'public', _tag: 'public' } as StorageDisk),

  /**
   * Check if the given storage disk is of a specific type of storage disk
   * by comparing the `_tag` property.
   *
   * @param tag - The tag to check against.
   */
  $is: <T extends StorageDisk['_tag']>(tag: T) => (disk: StorageDisk): disk is Extract<StorageDisk, { _tag: T }> => {
    return disk._tag === tag
  },

  /**
   * Match the given storage disk against a specific type of storage disk and
   * return the result of the matcher function.
   *
   * @param disk - The storage disk to match.
   * @param matcher - The object containing the matching functions for each type of storage disk.
   */
  $match: <T extends { readonly [M in StorageDisk['_tag']]: (disk: Extract<StorageDisk, { _tag: M }>) => any }>(disk: StorageDisk, matcher: T): Option.Option<ReturnType<T[StorageDisk['_tag']]>> => {
    if (has(matcher, disk._tag)) {
      return Option.some(matcher[disk._tag](disk as any) as ReturnType<T[StorageDisk['_tag']]>)
    }
    return Option.none<ReturnType<T[StorageDisk['_tag']]>>()
  },

  /**
   * Check if the given storage disk is a valid storage disk
   * by checking if it has the `STORAGE_DISK_MARKER` property.
   *
   * @param disk - The storage disk to check.
   */
  $isStorageDisk: (disk: unknown): disk is StorageDisk => {
    return !is.nullOrUndefined(disk)
      && is.object(disk)
      && has(disk, STORAGE_DISK_MARKER)
      && disk[STORAGE_DISK_MARKER] === STORAGE_DISK_MARKER
  },

  /**
   * Resolve the storage disk to a specific type of storage disk
   * by checking the `disk` property of the storage disk.
   *
   * @param disk - The storage disk to resolve.
   */
  $resolveStorageDisk: (disk: StorageDisk): keyof DriveDisks => {
    return pipe(
      StorageDisk.$match(disk, {
        default: ({ disk: value }) => value,
        fs: ({ disk: value }) => value,
        public: ({ disk: value }) => value,
      }),
      Option.getOrElse(() => env.get('DRIVE_DISK') as keyof DriveDisks),
    )
  },
}
