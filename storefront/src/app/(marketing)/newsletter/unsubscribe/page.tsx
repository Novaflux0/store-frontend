import { Container } from '@agency/ui';

import { NewsletterTokenPanel } from '@/components/newsletter/NewsletterTokenPanel';
import { PageHeader } from '@/components/sections/PageHeader';
import { getSettings } from '@/content/registry';
import { pageMetadata } from '@/lib/seo/metadata';

import { unsubscribeNewsletter } from '../actions';

// Static page; the token is read in the browser from the URL fragment (plan I2-7).
export async function generateMetadata() {
  const settings = await getSettings();
  const { site } = settings;
  return pageMetadata(
    {
      title: 'Unsubscribe',
      description: `Unsubscribe from the ${site.name} newsletter.`,
      path: '/newsletter/unsubscribe',
      noIndex: true,
    },
    settings,
  );
}

export default async function NewsletterUnsubscribePage() {
  const { site } = await getSettings();
  return (
    <>
      <PageHeader eyebrow="Newsletter" title="Unsubscribe from the newsletter" />
      <Container className="section-b">
        <noscript>
          <p className="mb-6 text-muted">
            Please enable JavaScript to unsubscribe, or reply to any newsletter to be removed.
          </p>
        </noscript>
        <NewsletterTokenPanel
          mode="unsubscribe"
          action={unsubscribeNewsletter}
          contactEmail={site.email}
        />
      </Container>
    </>
  );
}
