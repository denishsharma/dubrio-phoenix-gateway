import type { HttpContext as FrameworkHttpContext } from '@adonisjs/core/http'
import { DataSource } from '#constants/data_source'
import DatabaseTransaction from '#core/database/contexts/database_transaction_context'
import DatabaseService from '#core/database/services/database_service'
import ApplicationRuntimeExecution from '#core/effect/execution/application_runtime_execution'
import { WithEmptyResponseData } from '#core/http/constants/with_empty_response_data'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import UsingResponseEncoder from '#core/http/utils/using_response_encoder'
import { WithRetrievalStrategy } from '#core/lucid/constants/with_retrieval_strategy'
import LucidModelRetrievalService from '#core/lucid/services/lucid_model_retrieval_service'
import TelemetryService from '#core/telemetry/services/telemetry_service'
import BasicListContactPayload from '#modules/contact/payloads/contact_manager/basic_list_contact_payload'
import CreateContactPayload from '#modules/contact/payloads/contact_manager/create_contact_payload'
import DeleteContactPayload from '#modules/contact/payloads/contact_manager/delete_contact_payload'
import ListContactPayload from '#modules/contact/payloads/contact_manager/list_contact_payload'
import RetrieveContactDetailsPayload from '#modules/contact/payloads/contact_manager/retrieve_contact_details_payload'
import UpdateContactPayload from '#modules/contact/payloads/contact_manager/update_contact_payload'
import BasicListContactRequestPayload from '#modules/contact/payloads/request/contact_manager/basic_list_contact_request_payload'
import CreateContactRequestPayload from '#modules/contact/payloads/request/contact_manager/create_contact_request_payload'
import DeleteContactRequestPayload from '#modules/contact/payloads/request/contact_manager/delete_contact_request_payload'
import ListContactRequestPayload from '#modules/contact/payloads/request/contact_manager/list_contact_request_payload'
import RetrieveContactDetailsRequestPayload from '#modules/contact/payloads/request/contact_manager/retrieve_contact_details_request_payload'
import UpdateContactRequestPayload from '#modules/contact/payloads/request/contact_manager/update_contact_request_payload'
import ContactService from '#modules/contact/services/contact_service'
import { RetrieveWorkspaceUsingIdentifier } from '#shared/retrieval_strategies/workspace_retrieval_strategy'
import { Effect, pipe, Schema } from 'effect'

export default class ContactController {
  private telemetryScope = 'contact-controller'

  async create(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const telemetry = yield* TelemetryService

      const contactService = yield* ContactService
      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const payload = yield* CreateContactRequestPayload.fromRequest()
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

        const contact = yield* pipe(
          DataSource.known({
            contact: {
              first_name: payload.first_name,
              last_name: payload.last_name,
              email_address: payload.email_address,
              phone_number: payload.phone_number,
            },
            workspace,
          }),
          CreateContactPayload.fromSource(),
          Effect.flatMap(contactService.createContact),
        )

        return contact
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('create-contact'),
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

      const contactService = yield* ContactService

      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const payload = yield* ListContactRequestPayload.fromRequest()

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
            workspace,
            filters: payload.filters,
            include_attributes: payload.include_attributes,
            exclude_attributes: payload.exclude_attributes,
            pagination: payload.pagination ?? {
              mode: 'number' as const,
              page: 1,
              per_page: 25,
              limit: null,
              next_id: null,
            },
            sort: payload.sort,
          }),
          ListContactPayload.fromSource(),
          Effect.flatMap(contactService.list),
        )

        yield* responseContext.setMessage('Contacts retrieved successfully.')

        return result
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('contact.list'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  async listBasic(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const contactService = yield* ContactService

      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const payload = yield* BasicListContactRequestPayload.fromRequest()

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
            workspace,
            next_id: payload.next_id,
            limit: payload.limit,
          }),
          BasicListContactPayload.fromSource(),
          Effect.flatMap(contactService.basicList),
        )

        yield* responseContext.setMessage('Successfully retrieved all contacts')

        return yield* pipe(
          DataSource.known({
            data: result.data,
            pagination: result.pagination,
          }),
          UsingResponseEncoder(
            Schema.Struct({
              data: Schema.Array(
                Schema.Struct({
                  id: pipe(Schema.ULID, Schema.propertySignature, Schema.fromKey('uid')),
                  first_name: pipe(Schema.NullOr(Schema.String), Schema.propertySignature, Schema.fromKey('firstName')),
                  last_name: pipe(Schema.NullOr(Schema.String), Schema.propertySignature, Schema.fromKey('lastName')),
                  email: pipe(Schema.NullOr(Schema.String), Schema.propertySignature, Schema.fromKey('email')),
                  phone_number: pipe(Schema.NullOr(Schema.String), Schema.propertySignature, Schema.fromKey('phoneNumber')),
                }),
              ),
              pagination: Schema.Struct({
                hasNextPage: Schema.Boolean,
                nextCursor: Schema.NullOr(Schema.Number),
                limit: Schema.Number,
              }),
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('list_all_contacts'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }

  async details(ctx: FrameworkHttpContext) {
    return await Effect.gen(this, function* () {
      const database = yield* DatabaseService
      const lucidModelRetrieval = yield* LucidModelRetrievalService
      const responseContext = yield* HttpResponseContextService
      const telemetry = yield* TelemetryService

      const contactService = yield* ContactService

      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const requestPayload = yield* RetrieveContactDetailsRequestPayload.fromRequest()

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(requestPayload.workspace_identifier),
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

        const contact = yield* pipe(
          DataSource.known({
            workspace,
            contact_identifier: requestPayload.contact_identifier,
          }),
          RetrieveContactDetailsPayload.fromSource(),
          Effect.flatMap(contactService.details),
        )

        /**
         * Annotate the response message.
         */
        yield* responseContext.setMessage('Details of the contact retrieved successfully.')

        return yield* pipe(
          DataSource.known(contact),
          UsingResponseEncoder(
            Schema.Struct({
              id: pipe(Schema.ULID, Schema.propertySignature, Schema.fromKey('uid')),
              first_name: pipe(Schema.NullOr(Schema.String), Schema.propertySignature, Schema.fromKey('firstName')),
              last_name: pipe(Schema.NullOr(Schema.String), Schema.propertySignature, Schema.fromKey('lastName')),
              email: pipe(Schema.NullOr(Schema.String), Schema.propertySignature, Schema.fromKey('email')),
              phone_number: pipe(Schema.NullOr(Schema.String), Schema.propertySignature, Schema.fromKey('phoneNumber')),
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('contact_details'),
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

      const contactService = yield* ContactService

      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const requestPayload = yield* UpdateContactRequestPayload.fromRequest()

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(requestPayload.workspace_identifier),
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

        const updatedContact = yield* pipe(
          requestPayload.mode === 'replace'
            ? DataSource.known({
                workspace,
                contact_identifier: requestPayload.contact_identifier,
                mode: requestPayload.mode,
                data: requestPayload.data,
              })
            : DataSource.known({
                workspace,
                contact_identifier: requestPayload.contact_identifier,
                mode: requestPayload.mode,
                data: requestPayload.data,
              }),
          UpdateContactPayload.fromSource(),
          Effect.flatMap(contactService.updateContact),
        )

        yield* responseContext.setMessage(`Successfully updated contact: ${updatedContact.firstName}`)

        return yield* pipe(
          DataSource.known(updatedContact),
          UsingResponseEncoder(
            Schema.Struct({
              first_name: pipe(Schema.NullOr(Schema.String), Schema.propertySignature, Schema.fromKey('firstName')),
            }),
          ),
        )
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('update_contact'),
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

      const contactService = yield* ContactService

      return yield* Effect.gen(function* () {
        const { trx } = yield* database.requireTransaction()
        const requestPayload = yield* DeleteContactRequestPayload.fromRequest()

        const workspace = yield* pipe(
          WithRetrievalStrategy(
            RetrieveWorkspaceUsingIdentifier,
            retrieve => retrieve(requestPayload.workspace_identifier),
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

        const deletedContact = yield* pipe(
          DataSource.known({
            workspace,
            contact_identifier: requestPayload.contact_identifier,
          }),
          DeleteContactPayload.fromSource(),
          Effect.flatMap(contactService.deleteContact),
        )

        yield* responseContext.setMessage(`Successfully deleted contact: ${deletedContact.firstName}`)

        return WithEmptyResponseData()
      }).pipe(
        Effect.provide(DatabaseTransaction.provide(yield* database.createTransaction())),
        telemetry.withTelemetrySpan('delete_contact'),
        telemetry.withScopedTelemetry(this.telemetryScope),
      )
    }).pipe(ApplicationRuntimeExecution.runPromise({ ctx }))
  }
}
