import { expect, stubTurnstile, stubUploadStorage, test } from './fixtures';

/**
 * CSP (ADR 0004, nonce update): every page gets an enforced policy with a fresh
 * per-request nonce and `'strict-dynamic'`, never `'unsafe-inline'`. The
 * `cspViolations` fixture fails any test that triggers a violation, so every script a
 * page runs must carry the nonce or be loaded by one that does. These tests visit
 * the pages with the riskiest scripts: the 3D hero, Turnstile, the careers upload and
 * the newsletter pages.
 */

const PAGES = [
  '/',
  '/contact',
  '/blog',
  '/blog/3d-on-mid-range-phones',
  '/portfolio',
  '/portfolio/logistics-rebrand',
  '/careers',
  '/careers/3d-motion-designer',
  '/newsletter/confirm',
  '/newsletter/unsubscribe',
];

for (const path of PAGES) {
  test(`${path} is served with an enforced nonce CSP`, async ({ page }) => {
    const response = await page.goto(path);
    const enforced = response?.headers()['content-security-policy'] ?? '';
    expect(enforced).toMatch(/script-src 'nonce-[A-Za-z0-9+/]+={0,2}' 'strict-dynamic'/);
    expect(enforced).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(enforced).toContain("'wasm-unsafe-eval'");
    expect(enforced).toContain("object-src 'none'");
    expect(enforced).toContain("frame-ancestors 'none'");
    expect(response?.headers()['content-security-policy-report-only']).toBeUndefined();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
  });
}

test('home with the 3D journey (motion allowed) loads without violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const webgl = await page.evaluate(() =>
    Boolean(document.createElement('canvas').getContext('webgl2')),
  );
  // The scene mounts on idle; without WebGL the CSS fallback stays instead. Scoped to
  // <main>: the bottom navigation draws its gooey highlight on a canvas of its own.
  if (webgl) await expect(page.locator('main canvas')).toHaveCount(1, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
});

test('contact with Turnstile loaded runs without violations', async ({ page }) => {
  const loads = await stubTurnstile(page);
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Verify you are human' }).first().click();
  expect(loads.length).toBeGreaterThan(0);
});

test('every response gets a different nonce', async ({ request }) => {
  const nonceOf = async () =>
    /'nonce-([^']+)'/.exec(
      (await request.get('/')).headers()['content-security-policy'] ?? '',
    )?.[1];
  const [first, second] = [await nonceOf(), await nonceOf()];
  expect(first).toBeDefined();
  expect(first).not.toBe(second);
});

test('client-side navigation keeps working under the nonce policy', async ({ page }) => {
  await page.goto('/blog');
  await page.getByRole('link', { name: 'Keeping 3D smooth on mid-range phones' }).click();
  await expect(page).toHaveURL('/blog/3d-on-mid-range-phones');
  await page.getByRole('link', { name: 'All posts' }).click();
  await expect(page).toHaveURL('/blog');
});

test('the careers upload reaches the storage origin (connect-src)', async ({ page }) => {
  await stubTurnstile(page);
  const uploads = await stubUploadStorage(page);
  await page.goto('/careers/senior-frontend-engineer');
  const form = page.getByRole('form', { name: /^Apply for/ });
  await form.getByLabel(/^Name/).fill('Grace Hopper');
  await form.getByLabel(/^Email/).fill('grace@example.com');
  await form.getByLabel(/^CV/).setInputFiles({
    name: 'cv.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('PK\u0003\u0004 e2e'),
  });
  await form.getByRole('checkbox', { name: /I agree/ }).check();
  await form.getByRole('button', { name: 'Verify you are human' }).click();
  await form.getByRole('button', { name: 'Send application' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you for applying' })).toBeVisible();
  expect(uploads).toHaveLength(1);
});
