import type { Route } from 'next';
import Link from 'next/link';

import { Container, buttonClassName, cx } from '@agency/ui';

import { FadeIn } from '@/components/animation/FadeIn';
import { CtaBanner } from '@/components/sections/CtaBanner';
import { StandardPageHeader } from '@/components/sections/StandardPageHeader';
import { formatPrice } from '@/content/format';
import { listPricingPlans, listServices, type PricingPlan } from '@/content/registry';
import { BUDGET_CHOICES, BUDGET_LABELS } from '@/content/services';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { standardPageMetadata } from '@/lib/seo/page-metadata';

export function generateMetadata() {
  return standardPageMetadata('pricing', '/pricing', {
    title: 'Pricing',
    description:
      'Every project is quoted individually. See the plans and budget ranges we work with and the services we quote for.',
  });
}

/** The ranges from the contact form, without "Not sure yet" (covered below the grid). */
const RANGES = BUDGET_CHOICES.filter((choice) => choice.value !== 'not-sure');

/** The published plans from the dashboard; a highlighted plan stands out. */
function Plans({ plans }: { readonly plans: readonly PricingPlan[] }) {
  return (
    <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans.map(({ slug, title, data }) => (
        <li key={slug}>
          <FadeIn className="h-full">
            <article
              className={cx(
                'flex h-full flex-col rounded-2xl border bg-surface p-8',
                data.highlighted ? 'border-neon-cyan' : 'border-line',
              )}
            >
              {data.highlighted ? (
                <p className="mb-3 inline-flex self-start rounded-full border border-neon-cyan/50 px-3 py-0.5 text-xs text-neon-cyan">
                  Most popular
                </p>
              ) : null}
              <h3 className="font-display text-2xl font-semibold text-fg">{title}</h3>
              <p className="mt-2 text-muted">{data.summary}</p>
              <p className="mt-6 font-display text-3xl font-semibold text-fg">
                {formatPrice(data)}
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm text-muted">
                {data.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-neon-cyan"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={data.cta.href as Route}
                className={cx(
                  buttonClassName({ variant: data.highlighted ? 'primary' : 'ghost' }),
                  'mt-8',
                )}
              >
                {data.cta.label}
                <span className="sr-only"> ({title})</span>
              </Link>
            </article>
          </FadeIn>
        </li>
      ))}
    </ul>
  );
}

/** Without published plans: the budget ranges of the contact form. */
function BudgetRanges() {
  return (
    <>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {RANGES.map((range) => (
          <li key={range.value}>
            <FadeIn className="h-full">
              <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-8">
                <h3 className="font-display text-2xl font-semibold text-fg">{range.label}</h3>
                <Link
                  href="/contact"
                  className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-neon-cyan hover:underline"
                >
                  Discuss a project in this range
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            </FadeIn>
          </li>
        ))}
      </ul>
      <p className="mt-8 max-w-2xl text-muted">
        Not sure about your budget yet? That is fine: choose “{BUDGET_LABELS['not-sure']}” on the{' '}
        <Link href="/contact" className="text-neon-cyan hover:underline">
          contact form
        </Link>
        .
      </p>
    </>
  );
}

export default async function PricingPage() {
  const [plans, services] = await Promise.all([listPricingPlans(), listServices()]);
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ])}
      />
      <StandardPageHeader
        slug="pricing"
        fallback={{
          eyebrow: 'Pricing',
          heading: 'Pricing that fits the project',
          intro:
            'Every project is scoped and quoted individually, once we understand what you are building.',
        }}
      />

      <Container as="section" aria-labelledby="ranges-title" className="section-b">
        <h2 id="ranges-title" className="text-2xl font-semibold text-fg">
          {plans.length > 0 ? 'Plans' : 'Budget ranges'}
        </h2>
        {plans.length > 0 ? <Plans plans={plans} /> : <BudgetRanges />}
      </Container>

      {services.length > 0 ? (
        <Container as="section" aria-labelledby="services-title" className="section-y">
          <h2 id="services-title" className="text-2xl font-semibold text-fg">
            What we quote for
          </h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map(({ slug, title, data }) => (
              <li key={slug} className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="text-lg font-semibold text-fg">{title}</h3>
                <p className="mt-2 text-sm text-muted">{data.summary}</p>
                <Link
                  href={`/services#${slug}` as Route}
                  className="mt-4 inline-block text-sm text-neon-cyan hover:underline"
                >
                  More about {title}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      <CtaBanner />
    </>
  );
}
