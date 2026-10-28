import { Container } from '@agency/ui';

import { ContactForm } from '@/components/sections/ContactForm';
import { StandardPageHeader } from '@/components/sections/StandardPageHeader';
import { getSettings } from '@/content/registry';
import { clientEnv } from '@/lib/env/client';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { standardPageMetadata } from '@/lib/seo/page-metadata';

import { submitLead } from './actions';

export function generateMetadata() {
  return standardPageMetadata('contact', '/contact', {
    title: 'Contact',
    description: 'Tell us about your project or ask a question. We reply within one business day.',
  });
}

const LINK = 'text-neon-cyan underline underline-offset-4 hover:decoration-2';

export default async function ContactPage() {
  const { site, features } = await getSettings();
  // The form offers only the request kinds that are switched on (feature settings).
  const kinds = [
    ...(features.contactForm ? (['contact'] as const) : []),
    ...(features.inquiryForm ? (['inquiry'] as const) : []),
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />
      <StandardPageHeader
        slug="contact"
        fallback={{
          eyebrow: 'Contact',
          heading: "Let's build something great",
          intro: 'Tell us about your project or ask a question.',
        }}
      />
      <Container className="section-b grid gap-12 lg:grid-cols-[2fr_1fr]">
        <section aria-label="Contact form">
          {kinds.length > 0 ? (
            <ContactForm
              action={submitLead}
              turnstileSiteKey={clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              kinds={kinds}
            />
          ) : (
            <p className="rounded-2xl border border-line bg-surface p-6 text-muted">
              Our contact form is paused at the moment. Please email us at{' '}
              <a href={`mailto:${site.email}`} className={LINK}>
                {site.email}
              </a>{' '}
              instead.
            </p>
          )}
        </section>
        <aside aria-labelledby="contact-direct" className="flex flex-col gap-3">
          <h2 id="contact-direct" className="text-xl font-semibold text-fg">
            Prefer email?
          </h2>
          <p className="text-muted">
            Write to{' '}
            <a href={`mailto:${site.email}`} className={LINK}>
              {site.email}
            </a>
            .{kinds.length > 0 ? ' Fields marked with an asterisk (*) are required.' : null}
          </p>
          {site.replyTime ? <p className="text-muted">{site.replyTime}</p> : null}
          {site.phone ? (
            <p className="text-muted">
              Phone:{' '}
              <a href={`tel:${site.phone.replace(/[^\d+]/g, '')}`} className={LINK}>
                {site.phone}
              </a>
            </p>
          ) : null}
          {site.address ? (
            <address className="text-muted not-italic">
              {site.address.street}
              <br />
              {[site.address.postalCode, site.address.city].filter(Boolean).join(' ')}
              {site.address.region ? `, ${site.address.region}` : null}
            </address>
          ) : null}
          {site.hours ? <p className="text-sm text-muted">{site.hours}</p> : null}
        </aside>
      </Container>
    </>
  );
}
