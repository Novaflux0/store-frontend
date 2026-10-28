import AxeBuilder from '@axe-core/playwright';

import { expect, stubTurnstile, test } from './fixtures';

// WCAG 2.2 AA (doc §6.8, §16.3). Reduced motion keeps animated elements in their
// final state, so contrast is measured on what users actually read.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const PAGES = [
  '/',
  '/services',
  '/portfolio',
  '/about',
  '/blog',
  '/blog/why-we-prerender-everything',
  '/portfolio/product-configurator',
  '/careers',
  '/careers/senior-frontend-engineer',
  '/newsletter/confirm',
  '/newsletter/unsubscribe',
  '/contact',
  '/privacy',
  '/terms',
  '/cookies',
  '/does-not-exist',
];

test.use({ reducedMotion: 'reduce' });

for (const path of PAGES) {
  test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('/contact with validation errors has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/contact');
  await page.getByRole('radio', { name: /New project/ }).check();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Enter your name.')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('/careers/[slug] apply form with validation errors has no WCAG 2.2 AA violations', async ({
  page,
}) => {
  await page.goto('/careers/senior-frontend-engineer');
  const form = page.getByRole('form', { name: /^Apply for/ });
  await form.getByRole('button', { name: 'Send application' }).click();
  await expect(form.getByText('Attach your CV.')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('/newsletter/confirm with a token has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto(`/newsletter/confirm#token=${'A'.repeat(43)}`);
  await expect(page.getByRole('button', { name: 'Confirm subscription' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('footer newsletter form with errors has no WCAG 2.2 AA violations', async ({ page }) => {
  await stubTurnstile(page);
  await page.goto('/about');
  const form = page.getByRole('form', { name: 'Newsletter' });
  await form.getByLabel('Email').fill('not-an-email');
  await form.getByRole('button', { name: 'Subscribe' }).click();
  await expect(form.getByText('Enter a valid email address.')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
});
