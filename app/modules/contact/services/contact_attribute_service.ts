import type { ProcessedDataPayload } from '#core/data_payload/factories/data_payload'
import type CreateContactAttributePayload from '#modules/contact/payloads/contact_attribute/create_contact_attribute_payload'
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

    return {
      createContactAttribute,
    }
  }),
}) {}
