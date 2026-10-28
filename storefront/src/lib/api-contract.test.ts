import { describe, expectTypeOf, it } from 'vitest';

import {
  type API_ROUTES,
  type JobApplicationResponse,
  type NewsletterConfirmResponse,
  type NewsletterSubscribeResponse,
  type NewsletterUnsubscribeResponse,
  type UploadUrlResponse,
} from '@agency/types';
import type {
  JobApplicationInput,
  NewsletterSubscribeInput,
  NewsletterTokenInput,
  PublicUploadRequestInput,
} from '@agency/validation';

import type { ApiPostContract, ApiPostRoute } from './api-contract';

// Compile-time checks: `pnpm typecheck` fails if the contract drifts.
describe('ApiPostContract (Iteration 2 routes)', () => {
  it('covers every new public POST route', () => {
    expectTypeOf<
      | typeof API_ROUTES.newsletter.subscribe
      | typeof API_ROUTES.newsletter.confirm
      | typeof API_ROUTES.newsletter.unsubscribe
      | typeof API_ROUTES.files.uploadUrl
      | typeof API_ROUTES.careers.applications
    >().toExtend<ApiPostRoute>();
  });

  it('types the newsletter routes', () => {
    expectTypeOf<
      ApiPostContract['/newsletter/subscribe']['body']
    >().toEqualTypeOf<NewsletterSubscribeInput>();
    expectTypeOf<
      ApiPostContract['/newsletter/subscribe']['response']
    >().toEqualTypeOf<NewsletterSubscribeResponse>();
    expectTypeOf<
      ApiPostContract['/newsletter/confirm']['body']
    >().toEqualTypeOf<NewsletterTokenInput>();
    expectTypeOf<
      ApiPostContract['/newsletter/confirm']['response']
    >().toEqualTypeOf<NewsletterConfirmResponse>();
    expectTypeOf<
      ApiPostContract['/newsletter/unsubscribe']['response']
    >().toEqualTypeOf<NewsletterUnsubscribeResponse>();
  });

  it('types the careers upload and application routes', () => {
    expectTypeOf<PublicUploadRequestInput>().toExtend<
      ApiPostContract['/files/upload-url']['body']
    >();
    expectTypeOf<
      ApiPostContract['/files/upload-url']['response']
    >().toEqualTypeOf<UploadUrlResponse>();
    expectTypeOf<
      ApiPostContract['/careers/applications']['body']
    >().toEqualTypeOf<JobApplicationInput>();
    expectTypeOf<
      ApiPostContract['/careers/applications']['response']
    >().toEqualTypeOf<JobApplicationResponse>();
  });
});
