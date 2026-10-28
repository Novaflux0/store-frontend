import { test as base, expect, type Page } from '@playwright/test';

/**
 * Keeps the suite hermetic and strict:
 * - third-party requests (Cloudflare Turnstile) are blocked unless a test installs the
 *   local stub with `stubTurnstile`;
 * - uncaught page errors fail the test;
 * - every Content Security Policy violation (enforced or report-only) fails the test,
 *   which verifies the per-page script hashes on every page the suite visits.
 */
export const test = base.extend<{ pageErrors: Error[]; cspViolations: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on('pageerror', (error) => errors.push(error));
      await page.route(/^https:\/\/challenges\.cloudflare\.com\//, (route) => route.abort());
      await use(errors);
      expect(errors, 'uncaught page errors').toEqual([]);
    },
    { auto: true },
  ],
  cspViolations: [
    async ({ page }, use) => {
      const violations: string[] = [];
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          console.error(
            `CSP violation: ${event.disposition} ${event.effectiveDirective} ${event.blockedURI}`,
          );
        });
      });
      page.on('console', (message) => {
        const text = message.text();
        if (/Content Security Policy|CSP violation/i.test(text)) violations.push(text);
      });
      await use(violations);
      expect(violations, 'Content Security Policy violations').toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Serves a tiny Turnstile look-alike from the real script URL (so CSP is exercised
 * exactly as in production). Clicking "Verify you are human" issues a token; `reset()`
 * issues a fresh one automatically, like the managed widget does.
 */
const TURNSTILE_STUB = `
(() => {
  let next = 0;
  const widgets = new Map();
  const issue = (id) => {
    const widget = widgets.get(id);
    if (widget) widget.options.callback('e2e-turnstile-' + id + '-' + Date.now());
  };
  window.turnstile = {
    render(container, options) {
      const id = 'w' + String(++next);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Verify you are human';
      button.addEventListener('click', () => issue(id));
      container.appendChild(button);
      widgets.set(id, { container, options });
      return id;
    },
    reset(id) { setTimeout(() => issue(id), 50); },
    remove(id) {
      const widget = widgets.get(id);
      if (widget) widget.container.replaceChildren();
      widgets.delete(id);
    },
  };
})();
`;

export async function stubTurnstile(page: Page): Promise<string[]> {
  const loads: string[] = [];
  await page.route(/^https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/, (route) => {
    loads.push(route.request().url());
    return route.fulfill({ contentType: 'text/javascript', body: TURNSTILE_STUB });
  });
  return loads;
}

export const UPLOAD_ORIGIN = 'http://localhost:9000';

export interface StoredUpload {
  readonly url: string;
  readonly contentType: string | undefined;
  readonly size: number;
}

/**
 * Plays the object store (MinIO/R2) for presigned PUTs from the browser, including the
 * CORS preflight that a cross-origin PUT with `Content-Type` triggers.
 */
export async function stubUploadStorage(page: Page): Promise<StoredUpload[]> {
  const uploads: StoredUpload[] = [];
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  await page.route(`${UPLOAD_ORIGIN}/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    uploads.push({
      url: request.url(),
      contentType: (await request.headerValue('content-type')) ?? undefined,
      size: request.postDataBuffer()?.length ?? 0,
    });
    await route.fulfill({ status: 200, headers: cors, body: '' });
  });
  return uploads;
}

export { expect };
