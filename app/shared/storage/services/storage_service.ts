import type { WithStorage } from '#shared/storage/constants/with_storage'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import type { Disk } from '@adonisjs/drive'
import type { WriteOptions } from '@adonisjs/drive/types'
import type { ArrayTail } from 'type-fest'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import { StorageDisk } from '#shared/storage/constants/storage_disk'
import drive from '@adonisjs/drive/services/main'
import { Effect } from 'effect'
import { defaultTo } from 'lodash-es'

export default class StorageService extends Effect.Service<StorageService>()('@service/storage', {
  dependencies: [ErrorConversionService.Default, TelemetryService.Default],
  effect: Effect.gen(function* () {
    const errorConversion = yield* ErrorConversionService
    const telemetry = yield* TelemetryService

    function getDisk(storageDisk?: StorageDisk) {
      return Effect.sync(() => {
        const resolvedStorageDisk = StorageDisk.$resolveStorageDisk(defaultTo(storageDisk, StorageDisk.default()))
        const disk = drive.use(resolvedStorageDisk)
        Object.defineProperty(disk, 'provider', {
          value: resolvedStorageDisk,
          writable: false,
        })

        return disk as unknown as typeof disk & { readonly provider: Exclude<typeof storageDisk, undefined> }
      })
    }

    function putContent(...args: ArrayTail<Parameters<Disk['put']>>) {
      /**
       * @param withStorage - The storage configuration to be used.
       */
      return (withStorage: WithStorage) => {
        const disk = withStorage.disk
        const path = withStorage.destination.path

        return Effect.tryPromise({
          try: () => disk.put(path, ...args),
          catch: errorConversion.toUnknownError('Unexpected error occurred while putting file to disk.'),
        }).pipe(telemetry.withTelemetrySpan('storage_put', {
          attributes: {
            storage_disk_provider: disk.provider,
            storage_disk_path: path,
          },
        }))
      }
    }

    function deleteUsingKey(withStorage: WithStorage) {
      const disk = withStorage.disk
      const path = withStorage.destination.path

      return Effect.tryPromise({
        try: () => disk.delete(path),
        catch: errorConversion.toUnknownError('Unexpected error occurred while deleting file from disk.'),
      }).pipe(telemetry.withTelemetrySpan('storage_delete', {
        attributes: {
          storage_disk_provider: disk.provider,
          storage_disk_path: path,
        },
      }))
    }

    function getPublicUrl(withStorage: WithStorage) {
      const disk = withStorage.disk
      const path = withStorage.destination.path

      return Effect.tryPromise({
        try: () => disk.getUrl(path),
        catch: errorConversion.toUnknownError('Unexpected error occurred while getting signed URL.'),
      }).pipe(telemetry.withTelemetrySpan('storage_get_url', {
        attributes: {
          storage_disk_provider: disk.provider,
          storage_disk_path: path,
        },
      }))
    }

    function moveFromFileSystemToStorageDisk(source: string | URL, options?: WriteOptions) {
      /**
       * @param withStorage - The storage configuration to be used.
       */
      return (withStorage: WithStorage) => {
        const disk = withStorage.disk
        const path = withStorage.destination.path

        return Effect.tryPromise({
          try: () => disk.moveFromFs(source, path, options),
          catch: errorConversion.toUnknownError('Unexpected error occurred while moving file from filesystem to storage disk.'),
        }).pipe(telemetry.withTelemetrySpan('storage_move_from_file_system_to_storage_disk', {
          attributes: {
            storage_disk_provider: disk.provider,
            storage_disk_path: path,
          },
        }))
      }
    }

    function moveToDisk(
      file: MultipartFile,
      options?: WriteOptions & {
      /**
       * When using "stream", the file from the tmpPath will be read
       * as a stream and written to the cloud provider.
       *
       * Whereas, in case of "buffer", the entire file will be first
       * read into the memory and then sent to the cloud provider. Some
       * cloud providers like supabase cannot work with the "stream" option.
       */
        moveAs?: 'stream' | 'buffer';
      },
    ) {
      /**
       * @param withStorage - The storage configuration to be used.
       */
      return (withStorage: WithStorage) => {
        const disk = withStorage.disk
        const path = withStorage.destination.path

        return Effect.tryPromise({
          try: () => file.moveToDisk(path, disk.provider, options),
          catch: errorConversion.toUnknownError('Unexpected error occurred while moving file to storage disk.'),
        }).pipe(
          telemetry.withTelemetrySpan('storage_move_to_disk', {
            attributes: {
              storage_disk_provider: disk.provider,
              storage_disk_path: path,
              move_as: defaultTo(options?.moveAs, 'buffer'),
            },
          }),
        )
      }
    }

    return {
      /**
       * Get the storage disk instance for the given storage disk
       * or the default disk if no disk is provided.
       *
       * @param storageDisk - The storage disk to be used.
       */
      getDisk,

      /**
       * Put a file to the storage disk with the given storage destination.
       *
       * @param content - The content to be put to the disk.
       * @param options - The writing options for the disk.
       */
      put: putContent,

      /**
       * Delete a file from the storage disk using the provided storage destination.
       *
       * @param withStorage - The storage configuration to be used.
       */
      delete: deleteUsingKey,

      /**
       * Get the public URL for the file stored in the storage disk
       * using the provided storage destination.
       *
       * @param withStorage - The storage configuration to be used.
       */
      getUrl: getPublicUrl,

      /**
       * Move a file from the filesystem to the storage disk using the provided storage destination.
       *
       * @param source - The source path or URL of the file to be moved.
       * @param options - The writing options for the disk.
       */
      moveFromFs: moveFromFileSystemToStorageDisk,

      /**
       * Move a file to the storage disk using the provided storage destination.
       *
       * @param file - The file to be moved to the storage disk.
       * @param options - The writing options for the disk.
       */
      moveToDisk,
    }
  }),
}) {}
