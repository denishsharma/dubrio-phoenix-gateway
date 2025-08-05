import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type CreateContactPayload from '#modules/contact/payloads/contact_manager/create_contact_payload'
import type DeleteContactPayload from '#modules/contact/payloads/contact_manager/delete_contact_payload'
import type ListContactPayload from '#modules/contact/payloads/contact_manager/list_contact_payload'
import type RetrieveContactDetailsPayload from '#modules/contact/payloads/contact_manager/retrieve_contact_details_payload'
import type UpdateContactPayload from '#modules/contact/payloads/contact_manager/update_contact_payload'
import DatabaseService from '#core/database/services/database_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import ResourceNotFoundException from '#exceptions/resource_not_found_exception'
import Contact from '#models/contact_model'
import { Effect } from 'effect'

export default class ContactService extends Effect.Service<ContactService>()('@service/modules/contact/contact_service', {
  dependencies: [
    DatabaseService.Default,
    ErrorConversionService.Default,
    TelemetryService.Default,
    LucidModelRetrievalService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const errorConversion = yield* ErrorConversionService
    const telemetry = yield* TelemetryService

    function createContact(payload: ProcessedDataPayload<CreateContactPayload>) {
      return Effect.gen(function* () {
        const contact = yield* Effect.tryPromise({
          try: () => Contact.create({
            workspaceId: payload.workspace.id,
            firstName: payload.contact.first_name,
            lastName: payload.contact.last_name,
            email: payload.contact.email_address,
            phoneNumber: payload.contact.phone_number,
          }),
          catch: errorConversion.toUnknownError('Unexpected error while creating contact'),
        })

        return contact
      }).pipe(telemetry.withScopedTelemetry('create-contact'))
    }

    function list(payload: ProcessedDataPayload<ListContactPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        const query = Contact.query({ client: trx })
          .where('workspaceId', payload.workspace.id)
          .whereNull('deletedAt')

        if (payload.cursor) {
          query.where('id', '>', payload.cursor)
        }

        query.orderBy('id', 'asc')
          .limit(payload.limit + 1)

        /**
         * Retrieve contacts for the workspace with pagination.
         */
        const allContacts = yield* Effect.tryPromise({
          try: () => query,
          catch: errorConversion.toUnknownError('Unexpected error while retrieving contacts'),
        })

        // Check if there are more records
        const hasNextPage = allContacts.length > payload.limit
        const contacts = hasNextPage ? allContacts.slice(0, payload.limit) : allContacts

        // Get next cursor from the last contact's id
        const nextCursor = hasNextPage && contacts.length > 0 ? contacts[contacts.length - 1].id : null

        return {
          data: contacts,
          pagination: {
            hasNextPage,
            nextCursor,
            limit: payload.limit,
          },
        }
      }).pipe(telemetry.withTelemetrySpan('list_contacts'))
    }

    function details(payload: ProcessedDataPayload<RetrieveContactDetailsPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the contact using the provided identifier.
         */
        const contact = yield* Effect.tryPromise({
          try: () => Contact.query({ client: trx })
            .where('uid', payload.contact_identifier.value)
            .where('workspaceId', payload.workspace.id)
            .whereNull('deletedAt')
            .firstOrFail(),
          catch: () => new ResourceNotFoundException({
            data: {
              resource: 'contact',
            },
          }),
        })

        return contact
      }).pipe(telemetry.withTelemetrySpan('retrieve_contact_details', { attributes: { contact_identifier: payload.contact_identifier.value } }))
    }

    function updateContact(payload: ProcessedDataPayload<UpdateContactPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the contact using the provided identifier.
         */
        const contact = yield* Effect.tryPromise({
          try: () => Contact.query({ client: trx })
            .where('uid', payload.contact_identifier.value)
            .where('workspaceId', payload.workspace.id)
            .whereNull('deletedAt')
            .firstOrFail(),
          catch: () => new ResourceNotFoundException({
            data: {
              resource: 'contact',
            },
          }),
        })

        /**
         * Update the contact based on the mode (replace or partial).
         */
        if (payload.mode === 'replace') {
          contact.firstName = payload.data.first_name
          contact.lastName = payload.data.last_name ?? null
          contact.email = payload.data.email_address ?? null
          contact.phoneNumber = payload.data.phone_number ?? null
        } else {
          if (payload.data.first_name !== undefined) {
            contact.firstName = payload.data.first_name
          }
          if (payload.data.last_name !== undefined) {
            contact.lastName = payload.data.last_name
          }
          if (payload.data.email_address !== undefined) {
            contact.email = payload.data.email_address
          }
          if (payload.data.phone_number !== undefined) {
            contact.phoneNumber = payload.data.phone_number
          }
        }

        /**
         * Save the updated contact.
         */
        yield* Effect.tryPromise({
          try: () => contact.save(),
          catch: errorConversion.toUnknownError('Unexpected error while updating contact'),
        })

        return contact
      }).pipe(telemetry.withTelemetrySpan('update_contact', { attributes: { contact_identifier: payload.contact_identifier.value } }))
    }

    function deleteContact(payload: ProcessedDataPayload<DeleteContactPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        /**
         * Retrieve the contact using the provided identifier.
         */
        const contact = yield* Effect.tryPromise({
          try: () => Contact.query({ client: trx })
            .where('uid', payload.contact_identifier.value)
            .where('workspaceId', payload.workspace.id)
            .whereNull('deletedAt')
            .firstOrFail(),
          catch: () => new ResourceNotFoundException({
            data: {
              resource: 'contact',
            },
          }),
        })

        /**
         * Soft delete the contact.
         */
        yield* Effect.tryPromise({
          try: () => contact.delete(),
          catch: errorConversion.toUnknownError('Unexpected error while deleting contact'),
        })

        return contact
      }).pipe(telemetry.withTelemetrySpan('delete_contact', { attributes: { contact_identifier: payload.contact_identifier.value } }))
    }

    return {
      createContact,
      list,
      details,
      updateContact,
      deleteContact,
    }
  }),

}) {}
