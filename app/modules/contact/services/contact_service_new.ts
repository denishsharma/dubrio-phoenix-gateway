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

const SORT_COLUMNS = {
  uid: 'uid',
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  created_at: 'created_at',
}

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
        if (payload.filters && payload.filters.length > 0) {
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

            /**
             * Default fields that live on contacts table
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

              query.where(col, sqlOp, f.value)
              continue
            }

            /**
             * Custom attributes that require joins to contact_attribute_values
             */
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

            // Text/date fields
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

        /**
         * Apply sorting to the query.
         * If no sort is provided, default to sorting by uid in ascending order.
         */
        const sortRules = payload.sort && payload.sort.length > 0
          ? payload.sort
          : [{ attribute: 'uid', order: 'asc' as const }]

        for (const sort of sortRules) {
          const column = SORT_COLUMNS[sort.attribute as keyof typeof SORT_COLUMNS]
          if (!column) {
            throw new Error(`Unknown sort attribute: ${sort.attribute}`)
          }
          query.orderByRaw(`${column} IS NULL`)
          query.orderBy(column, sort.order)
        }

        let rows: Contact[] = []
        let pageMeta: any = {}

        /**
         * Apply pagination based on the specified mode.
         */
        if (payload.pagination.mode === 'number') {
          const page = payload.pagination.page ?? 1
          const perPage = payload.pagination.per_page ?? 25
          const offset = (page - 1) * perPage

          // Get total count for pagination metadata
          const totalRow = yield* Effect.tryPromise({
            try: () => query.clone()
              .clearSelect()
              .clearOrder()
              .countDistinct({ total: 'contacts.id' })
              .first(),
            catch: errorConversion.toUnknownError('Unexpected error while counting contacts'),
          })

          const total = Number((totalRow as any)?.total ?? 0)
          const totalPages = Math.max(1, Math.ceil(total / perPage))

          rows = yield* Effect.tryPromise({
            try: () => query.offset(offset).limit(perPage),
            catch: errorConversion.toUnknownError('Unexpected error while retrieving contacts'),
          })

          pageMeta = {
            mode: 'number' as const,
            page,
            per_page: perPage,
            total_items: total,
            total_pages: totalPages,
            has_prev: page > 1,
            has_next: page < totalPages,
          }
        } else if (payload.pagination.mode === 'next_id') {
          const limit = payload.pagination.limit ?? 25

          // Apply next_id cursor if provided
          if (payload.pagination.next_id) {
            query.where('contacts.id', '>', payload.pagination.next_id)
          }

          // Get limit + 1 to check if there are more records
          const allRows = yield* Effect.tryPromise({
            try: () => query.limit(limit + 1),
            catch: errorConversion.toUnknownError('Unexpected error while retrieving contacts'),
          })

          const hasNextPage = allRows.length > limit
          rows = hasNextPage ? allRows.slice(0, limit) : allRows
          const nextCursor = hasNextPage && rows.length > 0 ? rows[rows.length - 1].id.toString() : null

          pageMeta = {
            mode: 'next_id' as const,
            limit,
            has_next: hasNextPage,
            next_id: nextCursor,
          }
        }

        /**
         * Handle include/exclude attributes logic for enriching contact data.
         */
        let enrichedContacts: any = rows

        if (
          (payload.include_attributes && payload.include_attributes.length > 0)
          || (payload.exclude_attributes && payload.exclude_attributes.length > 0)
        ) {
          const contactIds = rows.map(contact => contact.id)

          if (contactIds.length > 0) {
            // Get all attributes for the workspace
            const allAttributes = yield* Effect.tryPromise({
              try: () => ContactAttribute.query({ client: trx })
                .where('workspaceId', payload.workspace.id)
                .select('id', 'slug', 'name', 'data_type', 'is_default', 'default_field_mapping'),
              catch: errorConversion.toUnknownError('Unexpected error while fetching contact attributes'),
            })

            // Filter attributes based on include/exclude rules
            let targetAttributes = allAttributes

            if (payload.include_attributes && payload.include_attributes.length > 0) {
              targetAttributes = allAttributes.filter(attr =>
                payload.include_attributes!.includes(attr.slug),
              )
            }

            if (payload.exclude_attributes && payload.exclude_attributes.length > 0) {
              targetAttributes = targetAttributes.filter(attr =>
                !payload.exclude_attributes!.includes(attr.slug),
              )
            }

            // Get attribute values for non-default attributes
            const customAttributes = targetAttributes.filter(attr => !attr.isDefault)
            let attributeValues: any[] = []

            if (customAttributes.length > 0) {
              const customAttributeIds = customAttributes.map(attr => attr.id)

              attributeValues = yield* Effect.tryPromise({
                try: () => trx
                  .from('contact_attribute_values')
                  .whereIn('contact_id', contactIds)
                  .whereIn('attribute_id', customAttributeIds)
                  .select('contact_id', 'attribute_id', 'value_text', 'value_number', 'value_boolean', 'option_id'),
                catch: errorConversion.toUnknownError('Unexpected error while fetching contact attribute values'),
              })
            }

            // Group attribute values by contact
            const valuesByContact = new Map<number, any[]>()
            attributeValues.forEach((value) => {
              if (!valuesByContact.has(value.contact_id)) {
                valuesByContact.set(value.contact_id, [])
              }
              valuesByContact.get(value.contact_id)!.push(value)
            })

            // Enrich contacts with attribute data
            enrichedContacts = rows.map((contact) => {
              const contactData = contact.serialize()
              const attributes: any = {}

              // Add default attributes if they're in the target list
              targetAttributes.forEach((attr) => {
                if (attr.isDefault && attr.defaultFieldMapping) {
                  const fieldValue = (contact as any)[attr.defaultFieldMapping]
                  attributes[attr.slug] = {
                    name: attr.name,
                    slug: attr.slug,
                    data_type: attr.dataType,
                    value: fieldValue,
                  }
                }
              })

              // Add custom attributes
              const contactValues = valuesByContact.get(contact.id) || []
              contactValues.forEach((value) => {
                const attr = customAttributes.find(a => a.id === value.attribute_id)
                if (attr) {
                  let attributeValue
                  switch (attr.dataType) {
                    case 'number':
                      attributeValue = value.value_number
                      break
                    case 'boolean':
                      attributeValue = value.value_boolean === 1
                      break
                    case 'single_choice':
                    case 'multiple_choice':
                      attributeValue = value.option_id
                      break
                    default:
                      attributeValue = value.value_text
                  }

                  attributes[attr.slug] = {
                    name: attr.name,
                    slug: attr.slug,
                    data_type: attr.dataType,
                    value: attributeValue,
                  }
                }
              })

              return {
                ...contactData,
                attributes,
              }
            })
          }
        }

        return {
          data: enrichedContacts,
          pagination: pageMeta,
        }
      }).pipe(telemetry.withTelemetrySpan('list_contacts'))
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
