import type { FaqItem } from '@/lib/seo/json-ld';

/**
 * Questions and answers under a post. Google only uses FAQPage structured data when
 * the same text is visible on the page, so this renders exactly what the JSON-LD says.
 */
export function FaqSection({ items }: { readonly items: readonly FaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="faq-heading" className="mt-16">
      <h2 id="faq-heading" className="text-3xl font-semibold tracking-tight text-fg">
        Frequently asked questions
      </h2>
      <dl className="mt-6 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <div key={item.question} className="py-5">
            <dt className="font-semibold text-fg">{item.question}</dt>
            <dd className="mt-2 leading-relaxed text-muted">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
