import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type CreateContactAttributePayload from '#modules/contact/payloads/contact_attribute/create_contact_attribute_payload'
import type DeleteContactAttributePayload from '#modules/contact/payloads/contact_attribute/delete_contact_attribute_payload'
import type DetailContactAttributePayload from '#modules/contact/payloads/contact_attribute/detail_contact_attribute_payload'
import type ListContactAttributePayload from '#modules/contact/payloads/contact_attribute/list_contact_attribute_payload'
import type UpdateContactAttributePayload from '#modules/contact/payloads/contact_attribute/update_contact_attribute_payload'
import { ContactAttributeDataType } from '#constants/contact_attribute_data_type'
import DatabaseService from '#core/database/services/database_service'
import ErrorConversionService from '#core/error/services/error_conversion_service'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import ContactAttribute from '#models/contact_attribute_model'
import ContactAttributeOption from '#models/contact_attribute_option_model'
import ContactAttributeException from '#modules/contact/exceptions/contact_attribute_exception'
import { Effect } from 'effect'

export default class ContactAttributeService extends Effect.Service<ContactAttributeService>()('@service/modules/contact/contact_attribute_service', {
  dependencies: [
    DatabaseService.Default,
    ErrorConversionService.Default,
    LucidModelRetrievalService.Default,
  ],
  effect: Effect.gen(function* () {
    const database = yield* DatabaseService
    const errorConversion = yield* ErrorConversionService

    function createContactAttribute(payload: ProcessedDataPayload<CreateContactAttributePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const isChoice = payload.data_type === ContactAttributeDataType.SINGLE_CHOICE || payload.data_type === ContactAttributeDataType.MULTIPLE_CHOICE

        if (isChoice && (!payload.options || payload.options.length === 0)) {
          return yield* new ContactAttributeException({ data: { reason: 'options_required' } })
        }

        if (!isChoice && payload.options && payload.options.length > 0) {
          return yield* new ContactAttributeException({ data: { reason: 'options_not_allowed' } })
        }

        if (isChoice && payload.options) {
          const set = new Set<string>()

          for (const o of payload.options) {
            if (set.has(o.option_value)) {
              return yield* new ContactAttributeException({ data: { reason: 'duplicate_option_value', details: { field: 'option_value', value: o.option_value } } })
            }
            set.add(o.option_value)
          }
        }

        const clash = yield* Effect.tryPromise({
          try: () => ContactAttribute.query({ client: trx })
            .where('workspace_id', payload.workspace.id)
            .where('slug', payload.slug.value)
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while checking for contact attribute slug clash'),
        })

        if (clash) {
          return yield* new ContactAttributeException({ data: { reason: 'slug_clash', details: { field: 'slug', value: payload.slug.value } } })
        }

        const create = yield* Effect.tryPromise({
          try: () => ContactAttribute.create(
            {
              workspaceId: payload.workspace.id,
              name: payload.name,
              dataType: payload.data_type,
              slug: payload.slug.value,
              isRequired: payload.is_required ?? false,
              isUnique: payload.is_unique ?? false,
              isDefault: false,
              defaultFieldMapping: null,
            },
            { client: trx },
          ),
          catch: errorConversion.toUnknownError('Unexpected error occurred while creating contact attribute'),
        })

        if (
          Array.isArray(payload.options)
          && payload.options.length > 0
          && (payload.data_type === ContactAttributeDataType.SINGLE_CHOICE || payload.data_type === ContactAttributeDataType.MULTIPLE_CHOICE)
        ) {
          const options = payload.options!
          yield* Effect.tryPromise({
            try: () => ContactAttributeOption.createMany(
              options.map((o, i) => ({
                contactAttributeId: create.id,
                optionValue: o.option_value,
                optionLabel: o.option_label,
                sortOrder: i,
              })),
              { client: trx },
            ),
            catch: errorConversion.toUnknownError('Unexpected error occurred while creating contact attribute options'),
          })
        }

        yield* Effect.tryPromise({
          try: () => trx.commit(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while committing transaction'),
        })

        const fresh = yield* Effect.tryPromise({
          try: () => ContactAttribute.query()
            .where('id', create.id)
            .preload('options', q => q.orderBy('sort_order'))
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving fresh contact attribute'),
        })

        return fresh
      })
    }

    function getContactAttribute(payload: ProcessedDataPayload<DetailContactAttributePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        const contactAttribute = yield* Effect.tryPromise({
          try: () => ContactAttribute.query({ client: trx })
            .where('workspace_id', payload.workspace.id)
            .where('uid', payload.id.value)
            .preload('options', q => q.orderBy('sort_order'))
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving contact attribute'),
        })

        if (!contactAttribute) {
          return yield* new ContactAttributeException({ data: { reason: 'contact_attribute_not_found' } })
        }

        return contactAttribute
      })
    }

    function listContactAttributes(payload: ProcessedDataPayload<ListContactAttributePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        const contactAttributes = yield* Effect.tryPromise({
          try: () => ContactAttribute.query({ client: trx })
            .where('workspace_id', payload.workspace.id)
            .preload('options', q => q.orderBy('sort_order'))
            .orderBy('created_at', 'desc'),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving contact attributes'),
        })

        return contactAttributes
      })
    }

    function updateContactAttribute(payload: ProcessedDataPayload<UpdateContactAttributePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const isChoice = payload.data.data_type === ContactAttributeDataType.SINGLE_CHOICE || payload.data.data_type === ContactAttributeDataType.MULTIPLE_CHOICE

        // First, get the existing contact attribute
        const existing = yield* Effect.tryPromise({
          try: () => ContactAttribute.query({ client: trx })
            .where('workspace_id', payload.workspace.id)
            .where('uid', payload.id.value)
            .preload('options')
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving contact attribute'),
        })

        if (!existing) {
          return yield* new ContactAttributeException({ data: { reason: 'contact_attribute_not_found' } })
        }

        // Validate options for choice types
        if (payload.data.data_type && isChoice && (!payload.data.options || payload.data.options.length === 0)) {
          return yield* new ContactAttributeException({ data: { reason: 'options_required' } })
        }

        if (payload.data.data_type && !isChoice && payload.data.options && payload.data.options.length > 0) {
          return yield* new ContactAttributeException({ data: { reason: 'options_not_allowed' } })
        }

        // Check for duplicate option values if options are provided
        if (payload.data.options && payload.data.options.length > 0) {
          const set = new Set<string>()
          for (const o of payload.data.options) {
            if (set.has(o.option_value)) {
              return yield* new ContactAttributeException({ data: { reason: 'duplicate_option_value', details: { field: 'option_value', value: o.option_value } } })
            }
            set.add(o.option_value)
          }
        }

        // Update the contact attribute
        const updateData: Partial<typeof existing> = {}
        if (payload.data.name !== undefined) { updateData.name = payload.data.name }
        if (payload.data.data_type !== undefined) { updateData.dataType = payload.data.data_type }
        if (payload.data.is_required !== undefined) { updateData.isRequired = payload.data.is_required }
        if (payload.data.is_unique !== undefined) { updateData.isUnique = payload.data.is_unique }

        yield* Effect.tryPromise({
          try: () => existing.merge(updateData).save(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while updating contact attribute'),
        })

        // Handle options update if provided
        if (payload.data.options !== undefined) {
          // Delete existing options
          yield* Effect.tryPromise({
            try: () => ContactAttributeOption.query({ client: trx })
              .where('contact_attribute_id', existing.id)
              .delete(),
            catch: errorConversion.toUnknownError('Unexpected error occurred while deleting existing options'),
          })

          // Create new options if provided
          if (payload.data.options.length > 0) {
            yield* Effect.tryPromise({
              try: () => ContactAttributeOption.createMany(
                payload.data.options!.map((o, i) => ({
                  contactAttributeId: existing.id,
                  optionValue: o.option_value,
                  optionLabel: o.option_label,
                  sortOrder: i,
                })),
                { client: trx },
              ),
              catch: errorConversion.toUnknownError('Unexpected error occurred while creating new options'),
            })
          }
        }

        yield* Effect.tryPromise({
          try: () => trx.commit(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while committing transaction'),
        })

        // Return fresh data
        const fresh = yield* Effect.tryPromise({
          try: () => ContactAttribute.query()
            .where('id', existing.id)
            .preload('options', q => q.orderBy('sort_order'))
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving updated contact attribute'),
        })

        return fresh
      })
    }

    function deleteContactAttribute(payload: ProcessedDataPayload<DeleteContactAttributePayload>) {
      return Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        const contactAttribute = yield* Effect.tryPromise({
          try: () => ContactAttribute.query({ client: trx })
            .where('workspace_id', payload.workspace.id)
            .where('uid', payload.id.value)
            .preload('options')
            .first(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while retrieving contact attribute'),
        })

        if (!contactAttribute) {
          return yield* new ContactAttributeException({ data: { reason: 'contact_attribute_not_found' } })
        }

        // Delete associated options first
        yield* Effect.tryPromise({
          try: async () => {
            contactAttribute.useTransaction(trx)
            return await contactAttribute.delete()
          },
          catch: errorConversion.toUnknownError('Unexpected error occurred while deleting contact attribute options'),
        })

        // Delete the contact attribute
        yield* Effect.tryPromise({
          try: () => contactAttribute.delete(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while deleting contact attribute'),
        })

        yield* Effect.tryPromise({
          try: () => trx.commit(),
          catch: errorConversion.toUnknownError('Unexpected error occurred while committing transaction'),
        })

        return contactAttribute
      })
    }

    return {
      createContactAttribute,
      getContactAttribute,
      listContactAttributes,
      updateContactAttribute,
      deleteContactAttribute,
    }
  }),
}) {}
