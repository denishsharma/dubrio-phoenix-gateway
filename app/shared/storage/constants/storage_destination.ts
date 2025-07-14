import type { TaggedEnum } from '#types/tagged_enum'
import { cuid } from '@adonisjs/core/helpers'
import is from '@adonisjs/core/helpers/is'
import stringHelpers from '@adonisjs/core/helpers/string'
import app from '@adonisjs/core/services/app'
import { Array, Option, pipe } from 'effect'
import { has } from 'lodash-es'

/**
 * A constant that represents the path to the temporary storage directory
 * in the local file system for storing temporary files.
 */
export const TEMPORARY_STORAGE_PATH = '.storage/tmp/'

/**
 * A unique symbol used to mark the `StorageDestination` type.
 * This symbol is used to differentiate the `StorageDestination` type from tagged enums.
 */
export const STORAGE_DESTINATION_MARKER: unique symbol = Symbol('@constant/enum/shared/storage/storage_destination')

/**
 * The shape of the `StorageDestination` type used to define the structure
 * of the storage destination that can be accepted.
 */
export interface StorageDestinationShape {
  root: { path: string };
  workspaceLogo: { path: string };
  userAvatar: { path: string };
}

/**
 * The `StorageDestination` type is a tagged enum that represents the different
 * types of storage destinations that can be accepted.
 */
export type StorageDestination = TaggedEnum<StorageDestinationShape, typeof STORAGE_DESTINATION_MARKER>

/**
 * Helper function to mark a storage destination with a unique symbol
 * to differentiate it from other types in runtime checks.
 */
function markStorageDestination(destination: StorageDestination) {
  return Object.defineProperty(destination, STORAGE_DESTINATION_MARKER, {
    get() { return STORAGE_DESTINATION_MARKER },
  }) as StorageDestination
}

/**
 * Helper function to resolve the storage destination path.
 *
 * It normalizes the path by replacing multiple slashes with a single slash
 * and slugify each segment of the path.
 *
 * @param path - The path to resolve.
 * @param temp - Whether to resolve the path from the app root directory or the storage disk.
 */
function resolveStorageDestination(path: string, temp: boolean = false) {
  const paths = Array.map(path.replace(/\/+|\\+/g, '/').split('/'), segment => stringHelpers.slug(segment))
  return temp ? app.makePath(TEMPORARY_STORAGE_PATH, ...paths) : paths.join('/')
}

/**
 * StorageDestination is a tagged enum that represents the different types of storage destinations
 * that can be accepted.
 *
 * It is a holder for various storage destinations, such as root, resume documents,
 * and user avatars.
 */
export const StorageDestination = {
  /**
   * The storage destination is the root directory of the storage disk
   * and will resolve to the path of the storage disk.
   *
   * @param key - The key to resolve the path.
   * @param temp - Whether to resolve the path from the app root directory or the storage disk.
   */
  root: (key: string, temp: boolean = false) => markStorageDestination({ path: resolveStorageDestination(key, temp), _tag: 'root' } as StorageDestination),

  /**
   * The storage destination is a workspace logo directory
   * and will resolve to the path of the workspace logo.
   *
   * @param key - The key to resolve the path.
   * @param temp - Whether to resolve the path from the app root directory or the storage disk.
   */
  workspaceLogo: (key: string, temp: boolean = false) => markStorageDestination({ path: resolveStorageDestination(`workspace-logos/${key}`, temp), _tag: 'workspaceLogo' } as StorageDestination),

  /**
   * The storage destination is a user avatar directory
   * and will resolve to the path of the user avatar.
   *
   * @param key - The key to resolve the path.
   * @param temp - Whether to resolve the path from the app root directory or the storage disk.
   */
  userAvatar: (key: string, temp: boolean = false) => markStorageDestination({ path: resolveStorageDestination(`user-avatars/${key}`, temp), _tag: 'userAvatar' } as StorageDestination),

  /**
   * Check if the given storage destination is of a specific type of storage destination
   * by comparing the `_tag` property.
   *
   * @param tag - The tag to check against.
   */
  $is: <T extends StorageDestination['_tag']>(tag: T) => (destination: StorageDestination): destination is Extract<StorageDestination, { _tag: T }> => {
    return destination._tag === tag
  },

  /**
   * Match the given storage destination against a specific type of storage destination
   * and return the result of the matching function.
   *
   * @param destination - The storage destination to match.
   * @param matcher - The object containing the matching functions for each type of storage destination.
   */
  $match: <T extends { readonly [M in StorageDestination['_tag']]: (destination: Extract<StorageDestination, { _tag: M }>) => any }>(destination: StorageDestination, matcher: T): Option.Option<ReturnType<T[StorageDestination['_tag']]>> => {
    if (has(matcher, destination._tag)) {
      return Option.some(matcher[destination._tag](destination as any) as ReturnType<T[StorageDestination['_tag']]>)
    }
    return Option.none<ReturnType<T[StorageDestination['_tag']]>>()
  },

  /**
   * Check if the given storage destination is a valid storage destination
   * by checking if it has the `STORAGE_DESTINATION_MARKER` property.
   *
   * @param destination - The storage destination to check.
   */
  $isStorageDestination: (destination: unknown): destination is StorageDestination => {
    return !is.nullOrUndefined(destination)
      && is.object(destination)
      && has(destination, STORAGE_DESTINATION_MARKER)
      && destination[STORAGE_DESTINATION_MARKER] === STORAGE_DESTINATION_MARKER
  },

  /**
   * Resolve the storage destination to a specific type of storage destination
   * by checking the `path` property of the storage destination.
   *
   * If the destination is not a valid storage destination,
   * it will return a temporary path using the `cuid` function.
   *
   * @param destination - The storage destination to resolve.
   */
  $resolveStorageDestination: (destination: StorageDestination): string => {
    return pipe(
      StorageDestination.$match(destination, {
        root: ({ path }) => path,
        workspaceLogo: ({ path }) => path,
        userAvatar: ({ path }) => path,
      }),
      Option.getOrElse(() => app.makePath(TEMPORARY_STORAGE_PATH, cuid())),
    )
  },
}
