import { expect, test } from './fixtures';

/** The home page sections, in reading order (their `<h2>` names). */
const SECTION_HEADINGS = [
  'Trusted by teams at',
  'Results in numbers',
  'Design, engineering and 3D under one roof',
  'Selected work',
  'How we work',
  'Why choose us',
  'What our clients say',
  'A small studio with big ambitions',
  'Latest from the blog',
  'Frequently asked questions',
  "Let's build something together",
] as const;

test.describe('home sections', () => {
  test.use({ reducedMotion: 'reduce' });

  test('renders every section in order, with FAQ structured data', async ({ page }) => {
    await page.goto('/');
    const headings = await page
      .getByRole('main')
      .getByRole('heading', { level: 2 })
      .allTextContents();
    expect(headings.map((text) => text.trim())).toEqual([...SECTION_HEADINGS]);

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLd.map((text) => (JSON.parse(text) as { '@type': string })['@type']);
    expect(types).toEqual(expect.arrayContaining(['Organization', 'FAQPage']));
  });

  test('shows the final stat values without animation', async ({ page }) => {
    await page.goto('/');
    // The numbers sit under the client logos, in the same section.
    const results = page.getByRole('region', { name: 'Trusted by teams at' });
    await expect(results.getByText('120+', { exact: true }).first()).toBeVisible();
  });

  test('opens one FAQ answer at a time', async ({ page }) => {
    await page.goto('/');
    const faq = page.getByRole('region', { name: 'Frequently asked questions' });
    const price = faq.getByText('How much does a website cost?');
    const timeline = faq.getByText('How long does a project take?');

    await price.click();
    await expect(faq.getByText(/fixed quote/)).toBeVisible();
    await timeline.click();
    await expect(faq.getByText(/6 to 10 weeks/)).toBeVisible();
    await expect(faq.getByText(/fixed quote/)).toBeHidden();
  });

  test('loads a video testimonial from youtube-nocookie only on request', async ({ page }) => {
    const requests: string[] = [];
    await page.route('https://www.youtube-nocookie.com/**', async (route) => {
      requests.push(route.request().url());
      await route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Player</title>',
      });
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(requests).toHaveLength(0);

    await page.getByRole('button', { name: /^Play video: Priya Natarajan/ }).click();
    await expect(page.locator('iframe[title^="Priya Natarajan"]')).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?/,
    );
    await expect.poll(() => requests.length).toBeGreaterThan(0);
  });

  test('keeps the final call to action clear of the bottom navigation', async ({ page }) => {
    await page.goto('/');
    const cta = page
      .getByRole('region', { name: "Let's build something together" })
      .getByRole('link', { name: 'Start a project' });
    await cta.scrollIntoViewIfNeeded();
    // A trial click fails if another element (the fixed bar) would receive the click.
    await cta.click({ trial: true });
  });

  test('has no horizontal overflow on a small phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
