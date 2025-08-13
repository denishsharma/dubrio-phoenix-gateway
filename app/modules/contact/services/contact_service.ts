import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type BasicListContactPayload from '#modules/contact/payloads/contact_manager/basic_list_contact_payload'
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
import ContactAttribute from '#models/contact_attribute_model'
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

    function basicList(payload: ProcessedDataPayload<BasicListContactPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        const query = Contact.query({ client: trx })
          .where('workspaceId', payload.workspace.id)
          .whereNull('deletedAt')

        if (payload.next_id) {
          query.where('id', '>', payload.next_id)
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

        // Get next next_id from the last contact's id
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

    function list(payload: ProcessedDataPayload<ListContactPayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        const query = Contact.query({ client: trx })
          .where('workspaceId', payload.workspace.id)
          .whereNull('deletedAt')

        const OP = {
          equals: '=',
          not_equals: '!=',
          gt: '>',
          gte: '>=',
          lt: '<',
          lte: '<=',
          like: 'like',
        } as const

        /**
         * If filters are present, apply them to the query.
         * This includes filtering by default fields and custom attributes.
         */
        if (payload.filters) {
          const slug = payload.filters.map(f => f.attribute)

          const attributes = yield* Effect.tryPromise({
            try: () => ContactAttribute.query({ client: trx })
              .where('workspaceId', payload.workspace.id)
              .whereIn('slug', slug)
              .select('id', 'slug', 'data_type', 'is_default', 'default_field_mapping'),
            catch: errorConversion.toUnknownError('Unexpected error while fetching contact attributes'),
          })

          const attributeMap = new Map(attributes.map(attr => [attr.slug, attr]))

          let i = 0
          for (const f of payload.filters) {
            const meta = attributeMap.get(f.attribute)

            if (!meta) {
              throw new Error(`Unknown contact attribute: ${f.attribute}`)
            }

            // TODO create exception here to check if meta is undefined

            /**
             * 5a. default fields that live on contacts
             * These fields are always present on the contact entity and can be used for filtering.
             * They are defined in the contact schema and include fields like name, email, and phone number.
             * no need to use joins here, we can simply filter on the contact table.
             */
            if (meta.isDefault && meta.defaultFieldMapping) {
              const col = `contacts.${meta.defaultFieldMapping}`

              if (f.operator === 'in') {
                query.whereIn(col, Array.isArray(f.value) ? f.value : [f.value])
                continue
              }

              if (f.operator === 'includes' || f.operator === 'like') {
                query.where(col, 'like', `%${String(f.value)}%`)
                continue
              }

              const sqlOp = OP[f.operator as keyof typeof OP]
              if (!sqlOp) {
                throw new Error(`Unknown operator: ${f.operator}`)
              }

              // TODO: Create exception for unsupported operators
              query.where(col, sqlOp, f.value)
              continue
            }

            const alias = `cav_${++i}`
            query.join(`contact_attribute_values as ${alias}`, function () {
              this.on(`${alias}.contact_id`, '=', 'contacts.id')
                .andOnVal(`${alias}.attribute_id`, '=', meta.id)
            })

            const valueCol
            = meta.dataType === 'number'
              ? `${alias}.value_number`
              : meta.dataType === 'boolean'
                ? `${alias}.value_boolean`
                : meta.dataType.includes('choice')
                  ? `${alias}.option_id`
                  : `${alias}.value_text`

            if (meta.dataType === 'single_choice' || meta.dataType === 'multiple_choice') {
              // Choice types: compare against option_id.
              //  - includes/in (ANY match): whereIn(option_id, [...])
              //  - equals: option_id = X
              if (f.operator === 'in' || f.operator === 'includes') {
                const arr = Array.isArray(f.value) ? f.value : [f.value]
                query.whereIn(valueCol, arr)
              } else {
                const sqlOp = OP[f.operator as keyof typeof OP]
                if (!sqlOp) { throw new Error(`Unsupported operator for choice type: ${f.operator}`) }
                query.where(valueCol, sqlOp, f.value as any)
              }
              continue
            }

            if (meta.dataType === 'number') {
              if (f.operator === 'in') {
                const arr = Array.isArray(f.value) ? f.value : [f.value]
                query.whereIn(valueCol, arr)
              } else if (f.operator === 'includes' || f.operator === 'like') {
                // “Contains” on a number: cast to CHAR for LIKE in MySQL.
                query.whereRaw(`CAST(${valueCol} AS CHAR) LIKE ?`, [`%${String(f.value)}%`])
              } else {
                const sqlOp = OP[f.operator as keyof typeof OP]
                if (!sqlOp) { throw new Error(`Unsupported numeric operator: ${f.operator}`) }
                query.where(valueCol, sqlOp, f.value as any)
              }
              continue
            }

            if (meta.dataType === 'boolean') {
              const v = f.value === true ? 1 : 0

              if (f.operator === 'equals') {
                query.where(valueCol, '=', v)
              } else if (f.operator === 'not_equals') {
                query.where(valueCol, '!=', v)
              } else {
                throw new Error(`Unsupported boolean operator: ${f.operator}`)
              }

              continue
            }

            if (f.operator === 'in') {
              const arr = Array.isArray(f.value) ? f.value.map(String) : [String(f.value)]
              if (arr.length === 0) {
                query.whereRaw('1=0')
              } else {
                query.whereIn(valueCol, arr)
              }
            } else if (f.operator === 'includes' || f.operator === 'like') {
              query.where(valueCol, 'like', `%${String(f.value)}%`)
            } else {
              const sqlOp = OP[f.operator as keyof typeof OP]
              if (!sqlOp) { throw new Error(`Unsupported text/date operator: ${f.operator}`) }
              query.where(valueCol, sqlOp, f.value)
            }
          }
        }
      })
    }

    return {
      createContact,
      basicList,
      details,
      updateContact,
      deleteContact,
      list,
    }
  }),

}) {}
