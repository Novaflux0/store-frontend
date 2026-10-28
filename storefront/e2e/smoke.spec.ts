import { expect, test } from './fixtures';

test.describe('home', () => {
  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('renders the hero, without WebGL', async ({ page }) => {
      await page.goto('/');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Design with purpose. Build with impact.' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Watch video' })).toBeVisible();
      // Give the idle callback time to fire; the 3D scene must still not mount. 2D
      // canvases (the still stack diagram) are fine: only a WebGL context counts.
      await page.waitForTimeout(2500);
      const webglCanvases = await page.evaluate(
        () =>
          [...document.querySelectorAll<HTMLCanvasElement>('main canvas')].filter(
            (canvas) => canvas.getContext('2d') === null,
          ).length,
      );
      expect(webglCanvases).toBe(0);
    });
  });

  test('keeps the content usable when 3D loads (or fails) in a normal session', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start a project' }).first()).toBeVisible();
  });

  test('includes Organization structured data', async ({ page }) => {
    await page.goto('/');
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(jsonLd ?? '{}')).toMatchObject({ '@type': 'Organization' });
  });
});

test('the bottom navigation reaches every main section', async ({ page }) => {
  await page.goto('/');
  // One landmark for both layouts: a floating pill on desktop, a tab bar on phones.
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const [label, path, heading] of [
    ['Projects', '/portfolio', /work that moves people/i],
    ['Services', '/services', /launch and grow/i],
    ['Pricing', '/pricing', /pricing that fits the project/i],
  ] as const) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  }

  await nav.getByRole('link', { name: "Let's Talk" }).click();
  await expect(page).toHaveURL('/contact');

  // Secondary sections sit in "More", which closes again after navigating.
  await nav.locator('details > summary').click();
  await nav.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL('/about');
  await expect(page.getByRole('heading', { level: 1, name: /small studio/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'About' })).toBeHidden();

  await nav.locator('details > summary').click();
  await nav.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL('/');
  await expect(
    page.getByRole('heading', { level: 1, name: /websites that feel like the future/i }),
  ).toBeVisible();
});

test('the theme toggle switches to light and remembers it', async ({ page, isMobile }) => {
  await page.goto('/services');
  const html = page.locator('html');
  const nav = page.getByRole('navigation', { name: 'Main' });
  // Desktop: icon button at the end of the bar. Phones: a row in the "More" menu.
  const openToggle = async () => {
    if (isMobile) await nav.locator('details > summary').click();
  };
  await expect(html).not.toHaveAttribute('data-theme');

  await openToggle();
  await nav.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');

  // Applied by the head script before paint on the next page load.
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await openToggle();
  await nav.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(html).not.toHaveAttribute('data-theme');
});

test.describe('back to top', () => {
  test.use({ reducedMotion: 'reduce' });

  test('appears after scrolling and returns to the top', async ({ page }) => {
    await page.goto('/services');
    const backToTop = page.getByRole('link', { name: 'Back to Top' });
    await expect(backToTop).toBeHidden();

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await expect(backToTop).toBeVisible();
    await backToTop.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(80);
  });
});

test('skip link moves focus to the main content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard navigation is a desktop concern');
  await page.goto('/services');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test.describe('contact form', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows validation errors from the shared schema', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('Enter your name.')).toBeVisible();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('You must agree before submitting.')).toBeVisible();
    await expect(page.getByText('Complete the security check.')).toBeVisible();
    await expect(page.getByLabel(/^Name/)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel(/^Name/)).toBeFocused();
  });

  test('reveals inquiry fields for a new project', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByLabel(/^Budget/)).toHaveCount(0);
    await page.getByRole('radio', { name: /New project/ }).check();
    await expect(page.getByLabel(/^Service/)).toBeVisible();
    await expect(page.getByLabel(/^Budget/)).toBeVisible();
    await expect(page.getByLabel(/^Timeline/)).toBeVisible();
  });
});

test('sends the security headers with an enforced nonce CSP', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();
  const csp = headers['content-security-policy'] ?? '';
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain('https://challenges.cloudflare.com');
  // ADR 0004 (nonce update): a per-request nonce, never inline scripts.
  expect(csp).toMatch(/script-src 'nonce-[A-Za-z0-9+/]+={0,2}' 'strict-dynamic'/);
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("base-uri 'none'");
  expect(csp).toContain('connect-src');
  expect(csp).toContain('http://localhost:9000');
  expect(headers['content-security-policy-report-only']).toBeUndefined();
  expect(headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains; preload');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('unknown paths get the enforced CSP too', async ({ request }) => {
  const response = await request.get('/does-not-exist');
  expect(response.status()).toBe(404);
  expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(response.headers()['content-security-policy-report-only']).toBeUndefined();
});

test('the client portal is closed in Release 1', async ({ page }) => {
  for (const path of ['/portal', '/portal/projects']) {
    await page.goto(path);
    await expect(page).toHaveURL('/');
  }
});

test('serves robots.txt, sitemap.xml and security.txt', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /portal');
  expect(robots).toContain('Disallow: /api');

  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/contact</loc>');
  expect(sitemap).toContain('/pricing</loc>');
  expect(sitemap).toContain('/blog/why-we-prerender-everything</loc>');
  expect(sitemap).toContain('/portfolio/product-configurator</loc>');
  expect(sitemap).toContain('/careers/senior-frontend-engineer</loc>');
  expect(sitemap).not.toContain('/newsletter/');

  const securityTxt = await request.get('/.well-known/security.txt');
  expect(securityTxt.ok()).toBe(true);
  expect(await securityTxt.text()).toContain('Contact: mailto:');
});

test('unknown pages render the 404 page', async ({ page }) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: /deep space/i })).toBeVisible();
});
