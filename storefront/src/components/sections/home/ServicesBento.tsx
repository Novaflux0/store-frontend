import Link from 'next/link';

import { Container } from '@agency/ui';

import { FadeIn } from '@/components/animation/FadeIn';
import { RevealHeading } from '@/components/animation/RevealHeading';
import type { Service } from '@/content/registry';

import { ServiceArt } from './ServiceArt';
import { ServiceScroller } from './ServiceScroller';

export interface ServicesBentoProps {
  /** Published services, in their dashboard order. */
  readonly services: readonly Pick<Service, 'slug' | 'title' | 'data'>[];
}

type ServiceItem = ServicesBentoProps['services'][number];

/** "A, B, C, and D." */
const listFormat = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

/** Accent words in headings: the italic serif against the sans display face. */
function Accent({ children }: { readonly children: string }) {
  return <em className="font-serif font-normal">{children}</em>;
}

/** A service name with its last word set in the accent face ("Web *design*"). */
function ServiceTitle({ title }: { readonly title: string }) {
  const split = title.lastIndexOf(' ');
  if (split === -1) return <>{title}</>;
  return (
    <>
      {title.slice(0, split + 1)}
      <Accent>{title.slice(split + 1)}</Accent>
    </>
  );
}

/** Number, name, divider, deliverables and link for one service. */
function ServiceText({
  service,
  index,
}: {
  readonly service: ServiceItem;
  readonly index: number;
}) {
  return (
    <div>
      <p aria-hidden="true" className="font-display text-sm text-neon-cyan">
        {String(index + 1).padStart(2, '0')}
      </p>
      <h3 className="mt-2 text-3xl font-semibold tracking-tight text-fg md:text-4xl">
        <ServiceTitle title={service.title} />
      </h3>
      <div
        aria-hidden="true"
        className="mt-5 h-px bg-[linear-gradient(to_right,var(--color-neon-violet),transparent)]"
      />
      <p className="mt-5 max-w-md text-muted">{listFormat.format(service.data.deliverables)}.</p>
      <Link
        href={`/services#${service.slug}`}
        className="group mt-6 inline-flex items-center gap-2 font-medium text-neon-violet-text"
      >
        See more<span className="sr-only"> about {service.title.toLowerCase()}</span>
        <span
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-1"
        >
          →
        </span>
      </Link>
    </div>
  );
}

/** A service's two illustration cards, the second staggered lower. */
function ServiceCards({ service }: { readonly service: ServiceItem }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6">
      <FadeIn>
        <ServiceArt service={service.data.serviceKey} index={0} />
      </FadeIn>
      <FadeIn delay={0.08} className="mt-12 md:mt-24">
        <ServiceArt service={service.data.serviceKey} index={1} />
      </FadeIn>
    </div>
  );
}

/**
 * What we do: a dark panel with rounded top corners rising over the hero. From laptop
 * width the services' text sits in one pinned panel on the left that slides to the next
 * service as its illustrations scroll past on the right (`ServiceScroller`); on smaller
 * screens each service's text sits above its cards.
 */
export function ServicesBento({ services }: ServicesBentoProps) {
  return (
    <section
      aria-labelledby="services-title"
      className="section-y rounded-t-[2rem] border-t border-line bg-bg md:rounded-t-[3rem]"
    >
      <Container>
        <p className="inline-flex rounded-full border border-neon-cyan/50 px-3 py-1 text-sm text-neon-cyan">
          What we do
        </p>
        <RevealHeading
          id="services-title"
          className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-fg md:text-6xl"
        >
          Design, engineering and <Accent>3D</Accent> under <Accent>one roof</Accent>
        </RevealHeading>

        <ul className="mt-16 flex flex-col gap-20 lg:hidden">
          {services.map((service, index) => (
            <li key={service.slug} className="flex flex-col gap-10">
              <ServiceText service={service} index={index} />
              <ServiceCards service={service} />
            </li>
          ))}
        </ul>

        <div className="mt-24 hidden lg:block">
          <ServiceScroller
            items={services.map((service, index) => (
              <ServiceText key={service.slug} service={service} index={index} />
            ))}
          >
            {services.map((service) => (
              <div key={service.slug} data-service-block="">
                <ServiceCards service={service} />
              </div>
            ))}
          </ServiceScroller>
        </div>

        <p className="mt-12">
          <Link href="/services" className="font-medium text-neon-cyan hover:underline">
            Explore our services <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Container>
    </section>
  );
}
