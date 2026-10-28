import { Container } from '@agency/ui';

import { NewsletterTokenPanel } from '@/components/newsletter/NewsletterTokenPanel';
import { PageHeader } from '@/components/sections/PageHeader';
import { getSettings } from '@/content/registry';
import { pageMetadata } from '@/lib/seo/metadata';

import { confirmNewsletter } from '../actions';

// Static page; the token is read in the browser from the URL fragment (plan I2-7).
export async function generateMetadata() {
  const settings = await getSettings();
  const { site } = settings;
  return pageMetadata(
    {
      title: 'Confirm your subscription',
      description: `Confirm your subscription to the ${site.name} newsletter.`,
      path: '/newsletter/confirm',
      noIndex: true,
    },
    settings,
  );
}

export default async function NewsletterConfirmPage() {
  const { site } = await getSettings();
  return (
    <>
      <PageHeader eyebrow="Newsletter" title="Confirm your subscription" />
      <Container className="section-b">
        <noscript>
          <p className="mb-6 text-muted">Please enable JavaScript to confirm your subscription.</p>
        </noscript>
        <NewsletterTokenPanel mode="confirm" action={confirmNewsletter} contactEmail={site.email} />
      </Container>
    </>
  );
}
