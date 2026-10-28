import type { Page } from '@playwright/test';

import { expect, stubTurnstile, stubUploadStorage, test } from './fixtures';

// Mirrors e2e/mock-api.ts.
const VALID_TOKEN = 'A'.repeat(43);
const EXPIRED_TOKEN = 'B'.repeat(43);
const EXPIRED_UPLOAD_NAME = 'Expired Upload';

const PDF = {
  name: 'ada-lovelace-cv.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.7\n% e2e test file\n'.repeat(400)),
};

test.use({ reducedMotion: 'reduce' });

test.describe('blog', () => {
  test('lists posts and opens one with Article structured data', async ({ page }) => {
    await page.goto('/blog');
    const firstPost = page.getByRole('main').getByRole('heading', { level: 2 }).first();
    const title = (await firstPost.textContent()) ?? '';
    await firstPost.getByRole('link').click();

    await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLd.map((text) => (JSON.parse(text) as { '@type': string })['@type']);
    expect(types).toEqual(expect.arrayContaining(['Article', 'BreadcrumbList']));
  });
});

test.describe('portfolio', () => {
  test('opens a case study with results and CreativeWork data', async ({ page }) => {
    await page.goto('/portfolio');
    await page.getByRole('link', { name: 'A 3D product configurator' }).click();

    await expect(page).toHaveURL('/portfolio/product-configurator');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('A 3D product configurator');
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
    await expect(page.getByRole('img', { name: /headphones/ })).toBeVisible();
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(jsonLd ?? '{}')).toMatchObject({ '@type': 'CreativeWork' });
  });
});

/** The job page also has the footer newsletter form, so every lookup is scoped. */
function applyForm(page: Page) {
  return page.getByRole('form', { name: /^Apply for/ });
}

test.describe('careers', () => {
  test('lists open roles and shows a job with JobPosting data', async ({ page }) => {
    await page.goto('/careers');
    await page.getByRole('link', { name: 'Senior Frontend Engineer' }).click();

    await expect(page).toHaveURL('/careers/senior-frontend-engineer');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Senior Frontend Engineer');
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(jsonLd ?? '{}')).toMatchObject({
      '@type': 'JobPosting',
      title: 'Senior Frontend Engineer',
      hiringOrganization: { '@type': 'Organization' },
      jobLocation: { '@type': 'Place' },
    });
  });

  test('the apply form shows validation errors and sends nothing', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST') posts.push(request.url());
    });
    await page.goto('/careers/senior-frontend-engineer');
    const form = applyForm(page);
    await form.getByRole('button', { name: 'Send application' }).click();

    await expect(form.getByText('Enter your name.')).toBeVisible();
    await expect(form.getByText('Enter a valid email address.')).toBeVisible();
    await expect(form.getByText('Attach your CV.')).toBeVisible();
    await expect(form.getByText('You must agree before submitting.')).toBeVisible();
    await expect(form.getByText('Complete the security check.')).toBeVisible();
    await expect(form.getByLabel(/^Name/)).toBeFocused();
    expect(posts).toEqual([]);
  });

  test('rejects a CV with the wrong type before uploading', async ({ page }) => {
    await page.goto('/careers/senior-frontend-engineer');
    const form = applyForm(page);
    await form.getByLabel(/^CV/).setInputFiles({
      name: 'cv.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await form.getByRole('button', { name: 'Send application' }).click();
    await expect(form.getByText('Attach your CV as a PDF or Word (.docx) file.')).toBeVisible();
  });

  async function fillApplication(page: Page, name: string) {
    const form = applyForm(page);
    await form.getByLabel(/^Name/).fill(name);
    await form.getByLabel(/^Email/).fill('ada@example.com');
    await form.getByLabel(/^CV/).setInputFiles(PDF);
    await form.getByRole('checkbox', { name: /I agree/ }).check();
    await form.getByRole('button', { name: 'Verify you are human' }).click();
  }

  test('uploads the CV to storage, then submits the application (mock API)', async ({ page }) => {
    await stubTurnstile(page);
    const uploads = await stubUploadStorage(page);
    await page.goto('/careers/3d-motion-designer');
    await fillApplication(page, 'Ada Lovelace');
    await applyForm(page).getByRole('button', { name: 'Send application' }).click();

    await expect(page.getByRole('heading', { name: 'Thank you for applying' })).toBeVisible();
    await expect(page.getByText(/We'll be in touch after reviewing your CV/)).toBeVisible();
    expect(uploads).toHaveLength(1);
    expect(uploads[0]?.url).toMatch(/^http:\/\/localhost:9000\/quarantine\//);
    expect(uploads[0]?.contentType).toBe('application/pdf');
    expect(uploads[0]?.size).toBe(PDF.buffer.length);
  });

  test('asks for the CV again when the upload has expired (422)', async ({ page }) => {
    await stubTurnstile(page);
    await stubUploadStorage(page);
    await page.goto('/careers/senior-frontend-engineer');
    await fillApplication(page, EXPIRED_UPLOAD_NAME);
    const form = applyForm(page);
    await form.getByRole('button', { name: 'Send application' }).click();

    await expect(form.getByRole('alert').filter({ hasText: /attach your CV again/ })).toBeVisible();
    await expect(form.getByLabel(/^CV/)).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByLabel(/^CV/)).toHaveValue('');
  });
});

test.describe('newsletter', () => {
  test('loads Turnstile only after the visitor interacts with the footer form', async ({
    page,
  }) => {
    const turnstileLoads = await stubTurnstile(page);
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    expect(turnstileLoads).toEqual([]);

    const form = page.getByRole('form', { name: 'Newsletter' });
    await form.getByLabel('Email').fill('ada@example.com');
    await expect.poll(() => turnstileLoads.length).toBe(1);
    await form.getByRole('button', { name: 'Verify you are human' }).click();
    await form.getByRole('button', { name: 'Subscribe' }).click();
    await expect(form.getByRole('status')).toHaveText(
      'Check your inbox to confirm your subscription.',
    );

    // The toast repeats it visually only: no second live region for screen readers.
    const toastCard = page.getByText('Almost subscribed');
    await expect(toastCard).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Almost subscribed' })).toHaveCount(0);
  });

  test('confirm page posts nothing until the button is clicked', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST') posts.push(request.url());
    });
    await page.goto(`/newsletter/confirm#token=${VALID_TOKEN}`);

    const button = page.getByRole('button', { name: 'Confirm subscription' });
    await expect(button).toBeVisible();
    // The token is removed from the address bar as soon as it has been read.
    await expect(page).toHaveURL(/\/newsletter\/confirm$/);
    await page.waitForLoadState('networkidle');
    expect(posts).toEqual([]);

    await button.click();
    await expect(page.getByRole('heading', { name: /You are subscribed/ })).toBeVisible();
    expect(posts).toHaveLength(1);
  });

  test('confirm page explains an expired link', async ({ page }) => {
    await page.goto(`/newsletter/confirm#token=${EXPIRED_TOKEN}`);
    await page.getByRole('button', { name: 'Confirm subscription' }).click();
    await expect(
      page.getByRole('heading', { name: 'This link is invalid or has expired' }),
    ).toBeVisible();
  });

  test('a link without a token shows the invalid message and no button', async ({ page }) => {
    await page.goto('/newsletter/confirm');
    await expect(
      page.getByRole('heading', { name: 'This link is invalid or has expired' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm subscription' })).toHaveCount(0);
  });

  test('unsubscribe page unsubscribes on click', async ({ page }) => {
    await page.goto(`/newsletter/unsubscribe#token=${VALID_TOKEN}`);
    await page.getByRole('button', { name: 'Unsubscribe' }).click();
    await expect(page.getByRole('heading', { name: 'You have been unsubscribed.' })).toBeVisible();
  });

  test('confirm and unsubscribe pages are not indexed', async ({ page }) => {
    for (const path of ['/newsletter/confirm', '/newsletter/unsubscribe']) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    }
  });
});

test('unknown content slugs are 404s', async ({ page }) => {
  for (const path of ['/blog/no-such-post', '/portfolio/no-such-work', '/careers/no-such-job']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: /deep space/i })).toBeVisible();
  }
});
