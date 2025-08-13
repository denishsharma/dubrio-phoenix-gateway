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
import CreateContactAttributeRequestPayload from '#modules/contact/payloads/request/contact_attribute/create_contact_attribute_request_payload'
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
}
