import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type EnsureWorkspaceLogoPayload from '#modules/workspace/payloads/workspace_manager/ensure_workspace_logo_payload'
import { DataSource } from '#constants/data_source'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import CreateWorkspaceGenericLogoPayload from '#modules/workspace/payloads/workspace_manager/create_workspace_generic_logo_payload'
import { HashAlgorithm } from '#shared/common/constants/hash_algorithm'
import HashService from '#shared/common/services/hash_service'
import { StorageDestination } from '#shared/storage/constants/storage_destination'
import { StorageDisk } from '#shared/storage/constants/storage_disk'
import { WithStorage } from '#shared/storage/constants/with_storage'
import StorageService from '#shared/storage/services/storage_service'
import { createAvatar } from '@dicebear/core'
import * as initials from '@dicebear/initials'
import { Effect, Exit, pipe } from 'effect'
import { defaultTo } from 'lodash-es'

export default class WorkspaceUtilityService extends Effect.Service<WorkspaceUtilityService>()('@service/modules/workspace/workspace_utility', {
  dependencies: [
    ErrorConversionService.Default,
    HashService.Default,
    StorageService.Default,
    TelemetryService.Default,
  ],
  effect: Effect.gen(function* () {
    const errorConversion = yield* ErrorConversionService
    const hash = yield* HashService
    const storage = yield* StorageService
    const telemetry = yield* TelemetryService

    function createGenericLogo(payload: ProcessedDataPayload<CreateWorkspaceGenericLogoPayload>) {
      return Effect.gen(function* () {
        const logoStorageDestination = yield* pipe(
          hash.hash(HashAlgorithm.SHA256, payload.workspace.identifier.value),
          Effect.map(id => StorageDestination.workspaceLogo(`${id.toLowerCase()}.svg`)),
        )

        /**
         * Seed for the avatar generation.
         * Value is based on the workspace first 2 characters or first character of the name.
         */
        const seed = yield* Effect.sync(() => {
          const name = payload.workspace.name
          return name.length > 1 ? name.slice(0, 2) : name.slice(0, 1)
        })

        /**
         * Generating a generic workspace logo using initials.
         */
        const svg = yield* pipe(
          Effect.try({
            try: () => createAvatar(initials, {
              seed,
              fontWeight: 600,
            }),
            catch: errorConversion.toUnknownError('Unexpected error occurred while generating workspace logo.'),
          }),
          Effect.map(avatar => avatar.toString()),
        )

        /**
         * Based on the finalization of the effect, the logo
         * will be either stored or deleted.
         */
        yield* Effect.addFinalizer(
          Exit.match({
            onFailure: () => pipe(
              WithStorage(logoStorageDestination, StorageDisk.public()),
              storage.delete,
              Effect.ignore,
            ),
            onSuccess: () => pipe(
              WithStorage(logoStorageDestination, StorageDisk.public()),
              storage.put(svg, { contentType: 'image/svg+xml', visibility: 'public' }),
              Effect.ignore,
            ),
          }),
        )

        /**
         * Get the URL of the stored logo.
         */
        const url = yield* pipe(
          WithStorage(logoStorageDestination, StorageDisk.public()),
          storage.getUrl,
        )

        return {
          url,
          destination: logoStorageDestination,
        }
      }).pipe(telemetry.withTelemetrySpan('create_workspace_generic_logo'))
    }

    function ensureLogo(payload: ProcessedDataPayload<EnsureWorkspaceLogoPayload>) {
      return Effect.gen(function* () {
        /**
         * Create the storage destination for the workspace logo.
         */
        const logoStorageDestination = yield* pipe(
          hash.hash(HashAlgorithm.SHA256, payload.workspace.identifier.value),
          Effect.map((id) => {
            const extname = defaultTo(payload.workspace.logo?.extname, 'svg')
            return StorageDestination.workspaceLogo(`${id.toLowerCase()}.${extname}`)
          }),
        )

        /**
         * If the logo is provided, move it to the storage destination.
         */
        if (payload.workspace.logo) {
          /**
           * Move the provided logo to the storage destination.
           */
          yield* pipe(
            WithStorage(logoStorageDestination, StorageDisk.public()),
            storage.moveToDisk(payload.workspace.logo),
          )

          /**
           * Get the URL of the stored logo.
           */
          const url = yield* pipe(
            WithStorage(logoStorageDestination, StorageDisk.public()),
            storage.getUrl,
          )

          /**
           * Based on the finalization of the effect, if the effect fails,
           * the logo will be deleted from the storage.
           */
          yield* Effect.addFinalizer(
            Exit.match({
              onFailure: () => pipe(
                WithStorage(logoStorageDestination, StorageDisk.public()),
                storage.delete,
                Effect.ignore,
              ),
              onSuccess: () => Effect.void,
            }),
          )

          return { url, destination: logoStorageDestination }
        }

        /**
         * If no logo is provided, create a generic logo.
         */
        return yield* pipe(
          DataSource.known({
            workspace: {
              identifier: payload.workspace.identifier,
              name: payload.workspace.name,
            },
          }),
          CreateWorkspaceGenericLogoPayload.fromSource(),
          Effect.flatMap(createGenericLogo),
        )
      }).pipe(telemetry.withTelemetrySpan('ensure_workspace_logo'))
    }

    return {
      /**
       * Creates a generic logo for the workspace using initials.
       * The logo is generated based on the workspace name and stored in the public storage.
       *
       * This will store the logo in the workspace logo directory
       * and return the URL of the stored logo.
       *
       * If the logo generation fails, it will delete the logo from the storage.
       *
       * @param payload - The payload containing workspace details.
       */
      createGenericLogo,

      /**
       * Ensures that the workspace logo is stored in the public storage.
       * If the logo is provided, it will be moved to the storage destination.
       * If the logo is not provided, a generic logo will be created.
       *
       * This will store the logo in the workspace logo directory
       * and return the URL of the stored logo.
       *
       * If the logo generation fails, it will delete the logo from the storage.
       *
       * @param payload - The payload containing workspace details and logo.
       */
      ensureLogo,
    }
  }),
}) {}
