// Contract-level stand-in for the NestJS API, used by the Playwright suite and by
// local builds without a running API (scripts/build.mjs). Node strips the types.
// Server Actions and the content reads call it server-side, where Playwright cannot
// intercept requests. It implements the agreed HTTP contract: the Iteration 2 forms
// (status codes, bodies and problem slugs) and the public CMS reads (ADR 0014), with
// the backend seed content in `mock-api/content.json` and the default settings.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const PORT = Number(process.env.MOCK_API_PORT ?? 4999);
const UPLOAD_ORIGIN = process.env.MOCK_UPLOAD_ORIGIN ?? 'http://localhost:9000';
const PREFIX = '/api/v1';

/** Mirrored in e2e/content.spec.ts: the only confirm token the mock accepts. */
const VALID_TOKEN = 'A'.repeat(43);
/** Mirrored in e2e/content.spec.ts: applications with this name get 422 `upload-not-found`. */
const EXPIRED_UPLOAD_NAME = 'Expired Upload';

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

function problem(response: ServerResponse, status: number, slug: string, title: string) {
  response.writeHead(status, { 'Content-Type': 'application/problem+json' });
  response.end(
    JSON.stringify({
      type: `https://api.agency.test/errors/${slug}`,
      title,
      status,
      detail: title,
      traceId: randomUUID(),
    }),
  );
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Mirrored in e2e/content.spec.ts: the only preview token the mock accepts. */
const PREVIEW_TOKEN = 'e2e-preview-token';

interface ContentEntry {
  readonly type: string;
  readonly slug: string;
  readonly title: string;
  readonly sortOrder: number;
  readonly publishedAt: string;
  readonly updatedAt: string;
  readonly data: unknown;
}

// Generated from backend/src/cli/seed/content.ts: the same content as a seeded database.
const CONTENT = JSON.parse(
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- a fixed file next to this script
  readFileSync(new URL('./mock-api/content.json', import.meta.url), 'utf8'),
) as readonly ContentEntry[];
const SETTINGS: unknown = JSON.parse(
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- a fixed file next to this script
  readFileSync(new URL('./mock-api/settings.json', import.meta.url), 'utf8'),
);

/** The published shape the API returns (without the type). */
function published({ type: _type, ...entry }: ContentEntry) {
  return entry;
}

/** `GET /settings/public` and `GET /content/...`; null when the path is not a content read. */
function contentRead(
  path: string,
  query: URLSearchParams,
): { status: number; body: unknown } | null {
  if (path === `${PREFIX}/settings/public`) return { status: 200, body: SETTINGS };
  if (path === `${PREFIX}/content/preview`) {
    if (query.get('token') !== PREVIEW_TOKEN) return { status: 400, body: null };
    const post = CONTENT.find((entry) => entry.slug === 'why-we-prerender-everything');
    return {
      status: 200,
      body: {
        type: post?.type,
        slug: post?.slug,
        title: 'Draft: why we prerender',
        updatedAt: post?.updatedAt,
        data: post?.data,
      },
    };
  }
  // Anchored, no nested quantifiers: linear time (test-only mock).
  // eslint-disable-next-line security/detect-unsafe-regex
  const match = /^\/api\/v1\/content\/([a-z-]+)(?:\/([a-z0-9-]+))?$/.exec(path);
  if (!match) return null;
  const [, type, slug] = match;
  const ofType = CONTENT.filter((entry) => entry.type === type);
  if (slug === undefined) {
    const sorted = [...ofType].sort((a, b) => a.sortOrder - b.sortOrder);
    return { status: 200, body: sorted.map(published) };
  }
  const entry = ofType.find((candidate) => candidate.slug === slug);
  return entry ? { status: 200, body: published(entry) } : { status: 404, body: null };
}

/** UUID v7 shape (the application schema validates `cvFileId` as v7). */
function uuidV7(): string {
  const hex = randomUUID().replace(/-/g, '');
  const time = Date.now().toString(16).padStart(12, '0');
  const variant = ((parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  return `${time.slice(0, 8)}-${time.slice(8, 12)}-7${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const server = createServer((request, response) => {
  void (async () => {
    const url = new URL(request.url ?? '/', 'http://mock.invalid');
    const path = url.pathname;
    if (request.method === 'GET' && path === `${PREFIX}/health/live`) {
      send(response, 200, { status: 'ok', details: {} });
      return;
    }
    const read = request.method === 'GET' ? contentRead(path, url.searchParams) : null;
    if (read) {
      if (read.status === 200) send(response, 200, read.body);
      else
        problem(
          response,
          read.status,
          read.status === 400 ? 'invalid-or-expired-token' : 'not-found',
          'Not Found',
        );
      return;
    }
    if (request.method !== 'POST') {
      problem(response, 404, 'not-found', 'Not Found');
      return;
    }
    const body = await readJson(request);
    switch (path) {
      case `${PREFIX}/newsletter/subscribe`:
        send(response, 202, { status: 'pending_confirmation' });
        return;
      case `${PREFIX}/newsletter/confirm`:
        if (body.token === VALID_TOKEN) send(response, 200, { status: 'confirmed' });
        else problem(response, 400, 'invalid-or-expired-token', 'Invalid or expired token');
        return;
      case `${PREFIX}/newsletter/unsubscribe`:
        send(response, 200, { status: 'unsubscribed' });
        return;
      case `${PREFIX}/files/upload-url`: {
        const fileId = uuidV7();
        send(response, 201, {
          fileId,
          uploadUrl: `${UPLOAD_ORIGIN}/quarantine/${fileId}?X-Amz-Signature=e2e`,
          method: 'PUT',
          headers: {
            'Content-Type': String(body.mimeType),
            'Content-Length': String(body.sizeBytes),
          },
          expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        });
        return;
      }
      case `${PREFIX}/careers/applications`:
        if (body.name === EXPIRED_UPLOAD_NAME) {
          problem(response, 422, 'upload-not-found', 'Upload not found');
          return;
        }
        send(response, 202, { id: uuidV7(), status: 'received' });
        return;
      default:
        problem(response, 404, 'not-found', 'Not Found');
    }
  })();
});

server.listen(PORT, '127.0.0.1');
