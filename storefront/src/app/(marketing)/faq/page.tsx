import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@agency/ui';

import { EmptyState } from '@/components/sections/EmptyState';
import { PageHeader } from '@/components/sections/PageHeader';
import { getSettings, listFaqs } from '@/content/registry';
import { JsonLd, breadcrumbJsonLd, faqPageJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'Frequently asked questions',
      description: 'Answers about prices, timelines, support and how we work.',
      path: '/faq',
    },
    await getSettings(),
  );
}

/** Every question from the dashboard's FAQ list, with FAQPage structured data. */
export default async function FaqPage() {
  const faqs = (await listFaqs()).map((faq) => ({ question: faq.title, answer: faq.data.answer }));
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'FAQ', path: '/faq' },
        ])}
      />
      {faqs.length > 0 ? <JsonLd data={faqPageJsonLd(faqs)} /> : null}
      <PageHeader eyebrow="FAQ" title="Frequently asked questions">
        <p>
          Prices, timelines, support and how we work. Can&apos;t find your answer?{' '}
          <Link href="/contact" className="text-neon-cyan underline underline-offset-4">
            Ask us directly
          </Link>
          .
        </p>
      </PageHeader>
      <Container as="section" aria-label="Questions" className="section-b">
        {faqs.length === 0 ? (
          <EmptyState title="No questions yet">
            <p>Questions and answers will appear here soon.</p>
          </EmptyState>
        ) : (
          <div className="max-w-3xl divide-y divide-line rounded-2xl border border-line bg-surface">
            {faqs.map((faq) => (
              <details key={faq.question} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-lg font-medium text-fg [&::-webkit-details-marker]:hidden">
                  <h2 className="text-lg font-medium">{faq.question}</h2>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-5 shrink-0 text-neon-cyan transition-transform duration-300 group-open:rotate-180"
                  >
                    <path d="M10 13.4 4.3 7.7l1.4-1.4L10 10.6l4.3-4.3 1.4 1.4z" />
                  </svg>
                </summary>
                <p className="px-6 pb-6 text-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
