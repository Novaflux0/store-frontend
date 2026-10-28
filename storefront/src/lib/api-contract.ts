import type {
  ApiRoute,
  CreateLeadResponse,
  HealthResponse,
  JobApplicationResponse,
  NewsletterConfirmResponse,
  NewsletterSubscribeResponse,
  NewsletterUnsubscribeResponse,
  UploadUrlResponse,
} from '@agency/types';
import type {
  CreateLeadInput,
  JobApplicationInput,
  NewsletterSubscribeInput,
  NewsletterConfirmInput,
  NewsletterUnsubscribeInput,
  PublicUploadRequestInput,
  RequestUploadInput,
} from '@agency/validation';

/**
 * Request body and response type of every POST route, built only from the shared
 * contract packages. `apiPost(route, body)` infers both from the route, so a caller
 * cannot send the wrong body or expect the wrong response.
 */
export interface ApiPostContract {
  '/leads': { body: CreateLeadInput; response: CreateLeadResponse };
  '/newsletter/subscribe': {
    body: NewsletterSubscribeInput;
    response: NewsletterSubscribeResponse;
  };
  '/newsletter/confirm': { body: NewsletterConfirmInput; response: NewsletterConfirmResponse };
  '/newsletter/unsubscribe': {
    body: NewsletterUnsubscribeInput;
    response: NewsletterUnsubscribeResponse;
  };
  '/careers/applications': { body: JobApplicationInput; response: JobApplicationResponse };
  /**
   * Anonymous visitors send `PublicUploadRequestInput` (careers CV only, with its own
   * Turnstile token, plan I2-1/I2-2); signed-in users (R2) send `RequestUploadInput`.
   */
  '/files/upload-url': {
    body: PublicUploadRequestInput | RequestUploadInput;
    response: UploadUrlResponse;
  };
}

/** Response type of every GET route. */
export interface ApiGetContract {
  '/health/live': HealthResponse;
  '/health/ready': HealthResponse;
}

/** Fails to compile if a contract key is not a route in `API_ROUTES`. */
type KnownRoutes<T extends ApiRoute> = T;

export type ApiPostRoute = KnownRoutes<keyof ApiPostContract>;
export type ApiGetRoute = KnownRoutes<keyof ApiGetContract>;
