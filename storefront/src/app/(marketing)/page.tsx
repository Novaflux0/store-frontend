import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CtaBanner } from '@/components/sections/CtaBanner';
import { Hero } from '@/components/sections/Hero';
import { AboutSnippet } from '@/components/sections/home/AboutSnippet';
import { FeaturedWork } from '@/components/sections/home/FeaturedWork';
import { HomeFaq } from '@/components/sections/home/HomeFaq';
import { LatestPosts } from '@/components/sections/home/LatestPosts';
import { OurStack } from '@/components/sections/home/OurStack';
import { ProcessSteps } from '@/components/sections/home/ProcessSteps';
import { ProductsSolutions } from '@/components/sections/home/ProductsSolutions';
import { ServicesBento } from '@/components/sections/home/ServicesBento';
import { Testimonials } from '@/components/sections/home/Testimonials';
import { TheResult } from '@/components/sections/home/TheResult';
import { TrustedBy } from '@/components/sections/home/TrustedBy';
import { WhyChooseUs } from '@/components/sections/home/WhyChooseUs';
import { JourneyCanvas } from '@/components/three/journey/JourneyCanvas';
import {
  getHomePage,
  getSettings,
  featuredOrAll,
  listBlogPosts,
  listFaqs,
  listCaseStudies,
  listServices,
  listTeam,
  listTestimonials,
} from '@/content/registry';
import { JsonLd, faqPageJsonLd, organizationJsonLd } from '@/lib/seo/json-ld';
import { orFallback } from '@/lib/seo/metadata';

const FEATURED_WORK = 4;
const LATEST_POSTS = 3;

export async function generateMetadata(): Promise<Metadata> {
  const [{ site, seo }, home] = await Promise.all([getSettings(), getHomePage()]);
  return {
    title: { absolute: orFallback(home?.data.seo?.title, `${site.name}: ${site.tagline}`) },
    description: orFallback(home?.data.seo?.description, seo.defaultDescription),
    alternates: { canonical: '/' },
  };
}

/**
 * Home page. Every section is server-rendered HTML; the 3D journey canvas sits behind
 * them, and each `data-journey-stage` wrapper tells the scene which pose to show
 * while that part of the page is on screen (see `journey-math.ts`). Content comes from
 * the CMS: the home page sections, services, case studies (featured first),
 * testimonials, the team and the latest posts.
 */
export default async function HomePage() {
  const [settings, home, allServices, work, allTestimonials, team, allPosts, allFaqs] =
    await Promise.all([
      getSettings(),
      getHomePage(),
      listServices(),
      listCaseStudies(),
      listTestimonials(),
      listTeam(),
      listBlogPosts(),
      listFaqs(),
    ]);
  if (home === null) notFound();
  const content = home.data;
  // Each list shows what the dashboard's "Home page" lists chose, or everything until
  // something is chosen. Case studies: the featured ones first, topped up with the newest.
  const services = featuredOrAll(allServices);
  const testimonials = featuredOrAll(allTestimonials);
  const posts = featuredOrAll(allPosts);
  const faqs = featuredOrAll(allFaqs).map((faq) => ({
    question: faq.title,
    answer: faq.data.answer,
  }));
  const featured = [
    ...work.filter((item) => item.data.featured),
    ...work.filter((item) => !item.data.featured),
  ].slice(0, FEATURED_WORK);

  return (
    <>
      <JsonLd data={organizationJsonLd(settings.site)} />
      {faqs.length > 0 ? <JsonLd data={faqPageJsonLd(faqs)} /> : null}
      <div className="relative isolate">
        <JourneyCanvas />
        <div data-journey-stage="0">
          <Hero
            hero={content.hero}
            siteName={settings.site.name}
            navigation={settings.navigation}
          />
          <TrustedBy clients={content.clients} stats={content.stats} />
        </div>
        <div data-journey-stage="1">
          <ServicesBento services={services} />
          <ProductsSolutions integrations={content.integrations} siteName={settings.site.name} />
        </div>
        <div data-journey-stage="2">
          <FeaturedWork items={featured} />
          <TheResult result={content.result} />
        </div>
        <div data-journey-stage="3">
          <ProcessSteps steps={content.process} />
        </div>
        <div data-journey-stage="4">
          <WhyChooseUs comparison={content.comparison} />
          <OurStack tech={content.tech} siteName={settings.site.name} />
          <Testimonials testimonials={testimonials.map((item) => item.data)} />
          <AboutSnippet
            team={team.map((member) => ({
              name: member.title,
              role: member.data.role,
              photo: member.data.photo,
              socials: member.data.socials,
            }))}
          />
          <LatestPosts posts={posts.slice(0, LATEST_POSTS)} />
          <HomeFaq faqs={faqs} {...(faqs.length < allFaqs.length ? { moreHref: '/faq' } : {})} />
        </div>
        <div data-journey-stage="5">
          <CtaBanner
            title={content.ctaBanner.title}
            subtitle={content.ctaBanner.subtitle}
            cta={content.ctaBanner.cta}
          />
        </div>
      </div>
    </>
  );
}
