import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import { DataSource } from '#constants/data_source'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseService from '#core/database/services/database_service'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import CreateContactAttributePayload from '#modules/contact/payloads/contact_attribute/create_contact_attribute_payload'
import DeleteContactAttributePayload from '#modules/contact/payloads/contact_attribute/delete_contact_attribute_payload'
import DetailContactAttributePayload from '#modules/contact/payloads/contact_attribute/detail_contact_attribute_payload'
import ListContactAttributePayload from '#modules/contact/payloads/contact_attribute/list_contact_attribute_payload'
import UpdateContactAttributePayload from '#modules/contact/payloads/contact_attribute/update_contact_attribute_payload'
import CreateContactAttributeRequestPayload from '#modules/contact/payloads/request/contact_attribute/create_contact_attribute_request_payload'
import DeleteContactAttributeRequestPayload from '#modules/contact/payloads/request/contact_attribute/delete_contact_attribute_request_payload'
import DetailContactAttributeRequestPayload from '#modules/contact/payloads/request/contact_attribute/detail_contact_attribute_request_payload'
import ListContactAttributeRequestPayload from '#modules/contact/payloads/request/contact_attribute/list_contact_attribute_request_payload'
import UpdateContactAttributeRequestPayload from '#modules/contact/payloads/request/contact_attribute/update_contact_attribute_request_payload'
import ContactAttributeService from '#modules/contact/services/contact_attribute_service'
import { RetrieveWorkspaceUsingIdentifier } from '#shared/retrieval_strategies/workspace_retrieval_strategy'
import { Effect, pipe } from 'effect'

export default class ContactAttributeController {
  private telemetryScope = 'contact_attribute'

  async create(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const telemetry = yield* TelemetryService
      const responseContext = yield* HttpResponseContextService

      const contactAttributeService = yield* ContactAttributeService

      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()

        console.warn('Received payload:', ctx.request.all())

        const payload = yield* CreateContactAttributeRequestPayload.fromRequest()

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(payload.workspace_identifier),
            {
              exception: {
                throw: true,
              },
              query: {
                client: trx,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
        )

        const result = yield* pipe(
          DataSource.known({
            name: payload.name,
            data_type: payload.data_type,
            is_required: payload.is_required,
            is_unique: payload.is_unique,
            slug: payload.slug,
            options: payload.options,
            workspace,
          }),
          CreateContactAttributePayload.fromSource(),
          Effect.flatMap(contactAttributeService.createContactAttribute),
        )

        yield* responseContext.setMessage('Contact attribute created successfully')

        console.warn('Contact attribute created:', result)

        return result
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('contact_attribute.create'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    })
      .pipe(
        ApplicationRuntimeExecution.runPromise({ ctx }),
      )
  }

  async details(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const contactAttributeService = yield* ContactAttributeService
      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const payload = yield* DetailContactAttributeRequestPayload.fromRequest()

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(payload.workspace_identifier),
            {
              exception: {
                throw: true,
              },
              query: {
                client: trx,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
        )

        const contactAttribute = yield* pipe(
          DataSource.known({
            workspace,
            id: payload.id,
          }),
          DetailContactAttributePayload.fromSource(),
          Effect.flatMap(contactAttributeService.getContactAttribute),
        )

        yield* responseContext.setMessage('Contact attribute details retrieved successfully')

        return contactAttribute
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('contact_attribute.details'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  async list(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const contactAttributeService = yield* ContactAttributeService

      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const payload = yield* ListContactAttributeRequestPayload.fromRequest()

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(payload.workspace_identifier),
            {
              exception: {
                throw: true,
              },
              query: {
                client: trx,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
        )

        const contactAttributes = yield* pipe(
          DataSource.known({
            workspace,
          }),
          ListContactAttributePayload.fromSource(),
          Effect.flatMap(contactAttributeService.listContactAttributes),
        )

        yield* responseContext.setMessage('Contact attributes retrieved successfully')

        return contactAttributes
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('contact_attribute.list'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  async update(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const contactAttributeService = yield* ContactAttributeService

      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const payload = yield* UpdateContactAttributeRequestPayload.fromRequest()

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(payload.workspace_identifier),
            {
              exception: {
                throw: true,
              },
              query: {
                client: trx,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
        )

        const updatedContactAttribute = yield* pipe(
          DataSource.known({
            workspace,
            id: payload.id,
            mode: payload.mode,
            data: payload.data,
          }),
          UpdateContactAttributePayload.fromSource(),
          Effect.flatMap(contactAttributeService.updateContactAttribute),
        )

        yield* responseContext.setMessage('Contact attribute updated successfully')

        return updatedContactAttribute
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('contact_attribute.update'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  async delete(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const contactAttributeService = yield* ContactAttributeService

      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const payload = yield* DeleteContactAttributeRequestPayload.fromRequest()

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(payload.workspace_identifier),
            {
              exception: {
                throw: true,
              },
              query: {
                client: trx,
              },
            },
          ),
          lucidModelRetrieval.retrieve,
        )

        const deletedContactAttribute = yield* pipe(
          DataSource.known({
            workspace,
            id: payload.id,
          }),
          DeleteContactAttributePayload.fromSource(),
          Effect.flatMap(contactAttributeService.deleteContactAttribute),
        )

        yield* responseContext.setMessage(`Successfully deleted contact attribute: ${deletedContactAttribute.name}`)

        return { success: true }
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('contact_attribute.delete'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }
}
