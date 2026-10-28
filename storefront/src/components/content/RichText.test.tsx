import type { RichTextNode } from '@agency/validation';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RichLink, RichText, headingId } from './RichText';

const text = (value: string, marks?: RichTextNode['marks']): RichTextNode =>
  marks === undefined ? { type: 'text', text: value } : { type: 'text', text: value, marks };
const doc = (...content: RichTextNode[]): RichTextNode => ({ type: 'doc', content });

describe('RichText', () => {
  it('derives heading ids from plain text', () => {
    expect(headingId('Why static pages?')).toBe('why-static-pages');
    expect(headingId('  1. Load it last ')).toBe('1-load-it-last');
    expect(headingId('???')).toBeUndefined();
  });

  it('renders headings below the page h1, with anchor ids', () => {
    render(
      <RichText
        doc={doc(
          { type: 'heading', attrs: { level: 2 }, content: [text('What static buys you')] },
          { type: 'heading', attrs: { level: 3 }, content: [text('Speed')] },
          { type: 'heading', attrs: { level: 4 }, content: [text('Detail')] },
        )}
      />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'what-static-buys-you');
    expect(screen.getByRole('heading', { level: 3, name: 'Speed' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Detail' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('renders H5 and H6, styles from the allowlist and unique ids for repeated headings', () => {
    render(
      <RichText
        doc={doc(
          {
            type: 'heading',
            attrs: { level: 5, fontFamily: 'lora', fontSize: 24, fontWeight: 700, lineHeight: 1.2 },
            content: [text('Setup')],
          },
          { type: 'heading', attrs: { level: 6 }, content: [text('Setup')] },
          {
            type: 'heading',
            attrs: { level: 2, fontFamily: 'nope; color: red' },
            content: [text('Plain')],
          },
        )}
      />,
    );
    const h5 = screen.getByRole('heading', { level: 5 });
    expect(h5).toHaveAttribute('id', 'setup');
    expect(h5.style.fontFamily).toContain('var(--font-lora)');
    expect(h5.style.fontSize).toBe('1.5rem');
    expect(h5.style.fontWeight).toBe('700');
    expect(h5.style.lineHeight).toBe('1.2');
    expect(screen.getByRole('heading', { level: 6 })).toHaveAttribute('id', 'setup-2');
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveAttribute('style');
  });

  it("adds the editor's rel qualifiers to external links and captions images", () => {
    const { container } = render(
      <RichText
        doc={doc(
          {
            type: 'paragraph',
            content: [
              text('partner', [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://partner.example',
                    target: '_blank',
                    rel: 'sponsored nofollow',
                  },
                },
              ]),
            ],
          },
          {
            type: 'image',
            attrs: {
              src: '/images/a.webp',
              alt: 'Chart',
              width: 800,
              height: 600,
              caption: 'Figure 1',
            },
          },
        )}
      />,
    );
    const link = screen.getByRole('link', { name: 'partner' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow sponsored');
    expect(link).toHaveAttribute('target', '_blank');
    expect(container.querySelector('figure figcaption')).toHaveTextContent('Figure 1');
  });

  it('renders paragraphs, marks, lists, quotes, code and rules', () => {
    const { container } = render(
      <RichText
        doc={doc(
          {
            type: 'paragraph',
            content: [
              text('bold', [{ type: 'bold' }]),
              text('italic', [{ type: 'italic' }]),
              text('struck', [{ type: 'strike' }]),
              text('code', [{ type: 'code' }]),
              { type: 'hardBreak' },
              text('after'),
            ],
          },
          {
            type: 'orderedList',
            attrs: { start: 3 },
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [text('one')] }] },
            ],
          },
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [text('dot')] }] },
            ],
          },
          { type: 'blockquote', content: [{ type: 'paragraph', content: [text('quoted')] }] },
          { type: 'codeBlock', attrs: { language: 'txt' }, content: [text('line 1\nline 2')] },
          { type: 'horizontalRule' },
        )}
      />,
    );
    expect(screen.getByText('bold').closest('strong')).not.toBeNull();
    expect(screen.getByText('italic').closest('em')).not.toBeNull();
    expect(screen.getByText('struck').closest('s')).not.toBeNull();
    expect(screen.getByText('code').closest('code')).not.toBeNull();
    expect(container.querySelector('br')).not.toBeNull();
    expect(container.querySelector('ol')).toHaveAttribute('start', '3');
    expect(screen.getByText('dot').closest('ul')).not.toBeNull();
    expect(screen.getByText('quoted').closest('blockquote')).not.toBeNull();
    expect(container.querySelector('pre')).toHaveAttribute('tabindex', '0');
    expect(container.querySelector('pre code')?.textContent).toBe('line 1\nline 2');
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('renders site images through the image optimiser', () => {
    render(
      <RichText
        doc={doc({
          type: 'image',
          attrs: { src: '/images/work/a.png', alt: 'Diagram', width: 800, height: 400 },
        })}
      />,
    );
    const image = screen.getByRole('img', { name: 'Diagram' });
    expect(image).toHaveAttribute('width', '800');
    expect(image.getAttribute('src')).toContain('/_next/image?url=%2Fimages%2Fwork%2Fa.png');
  });

  it('renders nothing for unknown nodes, unknown marks and non-documents', () => {
    const { container } = render(
      <RichText
        doc={doc(
          { type: 'iframe', attrs: { src: 'https://evil.example' } } as unknown as RichTextNode,
          { type: 'paragraph', content: [text('kept', [{ type: 'script' } as never])] },
        )}
      />,
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText('kept')).toBeInTheDocument();
    const empty = render(<RichText doc={{ type: 'paragraph' }} />);
    expect(empty.container).toBeEmptyDOMElement();
    expect(render(<RichText doc={undefined} />).container).toBeEmptyDOMElement();
  });

  it('renders links from link marks, opening a new tab only when asked', () => {
    render(
      <RichText
        doc={doc({
          type: 'paragraph',
          content: [
            text('docs', [
              { type: 'link', attrs: { href: 'https://example.com', target: '_blank' } },
            ]),
            text('services', [{ type: 'link', attrs: { href: '/services' } }]),
          ],
        })}
      />,
    );
    const external = screen.getByRole('link', { name: 'docs' });
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'services' })).not.toHaveAttribute('target');
  });
});

describe('RichLink', () => {
  it('renders internal, anchor, external and unsafe links safely', () => {
    render(
      <>
        <RichLink href="/services" newTab={false}>
          internal
        </RichLink>
        <RichLink href="#section" newTab={false}>
          anchor
        </RichLink>
        <RichLink href="https://example.com" newTab={false}>
          external
        </RichLink>
        <RichLink href="mailto:hello@agency.com" newTab={false}>
          mail
        </RichLink>
        <RichLink href="javascript:alert(1)" newTab>
          unsafe
        </RichLink>
        <RichLink href="//evil.example" newTab={false}>
          protocol-relative
        </RichLink>
        <RichLink href={'/\\evil.example'} newTab={false}>
          backslash
        </RichLink>
      </>,
    );
    expect(screen.getByRole('link', { name: 'internal' })).toHaveAttribute('href', '/services');
    expect(screen.getByRole('link', { name: 'anchor' })).toHaveAttribute('href', '#section');
    expect(screen.getByRole('link', { name: 'external' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.getByRole('link', { name: 'external' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'mail' })).toHaveAttribute(
      'href',
      'mailto:hello@agency.com',
    );
    expect(screen.queryByRole('link', { name: 'unsafe' })).not.toBeInTheDocument();
    expect(screen.getByText('unsafe').tagName).toBe('SPAN');
    expect(screen.queryByRole('link', { name: 'protocol-relative' })).not.toBeInTheDocument();
    // Browsers treat `\` like `/`, so `/\evil.example` would leave the site.
    expect(screen.queryByRole('link', { name: 'backslash' })).not.toBeInTheDocument();
  });
});
