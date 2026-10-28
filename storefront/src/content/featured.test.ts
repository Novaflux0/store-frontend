import { describe, expect, it } from 'vitest';

import { featuredOrAll } from './featured';

const entry = (slug: string, featured?: boolean) => ({ slug, data: { featured } });

describe('featuredOrAll', () => {
  it('keeps only the featured entries, in order', () => {
    const list = [entry('a'), entry('b', true), entry('c', false), entry('d', true)];
    expect(featuredOrAll(list).map((item) => item.slug)).toEqual(['b', 'd']);
  });

  it('falls back to every entry while none is featured', () => {
    const list = [entry('a'), entry('b', false)];
    expect(featuredOrAll(list).map((item) => item.slug)).toEqual(['a', 'b']);
    expect(featuredOrAll([])).toEqual([]);
  });
});
