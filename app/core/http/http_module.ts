import HttpMakeResponseService from '#core/http/services/http_make_response_service'
import HttpRequestService from '#core/http/services/http_request_service'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import HttpResponseUtilityService from '#core/http/services/http_response_utility_service'
import { Layer } from 'effect'

export const CORE_HTTP_MODULE_LAYER = Layer.mergeAll(
  HttpResponseUtilityService.Default,
  HttpRequestService.Default,
  HttpResponseContextService.Default,
  HttpMakeResponseService.Default,
)
