import type { NavigationSettings, SiteSettings } from '@agency/validation';
import type { Route } from 'next';
import Link from 'next/link';

import { Container } from '@agency/ui';

import { subscribeNewsletter } from '@/app/(marketing)/newsletter/actions';
import { NewsletterForm } from '@/components/newsletter/NewsletterForm';
import { clientEnv } from '@/lib/env/client';

export interface SiteFooterProps {
  readonly site: Pick<SiteSettings, 'name' | 'legalName' | 'tagline' | 'email'>;
  readonly navigation: NavigationSettings;
  /** The newsletter form is hidden when the feature is switched off. */
  readonly newsletter: boolean;
}

export function SiteFooter({ site, navigation, newsletter }: SiteFooterProps) {
  const year = new Date().getFullYear();
  const main = [...navigation.start, ...navigation.end, ...navigation.more, navigation.cta];
  return (
    <footer className="border-t border-line">
      <Container className="section-y grid gap-10 md:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1.6fr]">
        <div className="flex flex-col gap-3">
          <p className="font-display text-lg font-semibold text-fg">{site.name}</p>
          <p className="max-w-xs text-sm text-muted">{site.tagline}</p>
          <a href={`mailto:${site.email}`} className="text-sm text-neon-cyan hover:underline">
            {site.email}
          </a>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {main.map((item) => (
              <li key={`${item.href} ${item.label}`}>
                <Link href={item.href as Route} className="text-muted hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <ul className="flex flex-col gap-2 text-sm">
            {navigation.legal.map((item) => (
              <li key={item.href}>
                <Link href={item.href as Route} className="text-muted hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {newsletter ? (
          <div className="md:col-span-3 lg:col-span-1">
            <NewsletterForm
              action={subscribeNewsletter}
              turnstileSiteKey={clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            />
          </div>
        ) : null}
      </Container>
      {/* Bottom padding keeps the last line clear of the fixed bottom navigation. */}
      <Container className="border-t border-line pt-6 pb-28 md:pb-32">
        <p className="text-xs text-muted">
          © {year} {site.legalName}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
