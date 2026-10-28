import { describe, expect, it } from 'vitest';

import { splitHeadline } from './split-headline';

describe('splitHeadline', () => {
  it('splits off the accent word and starts a new line after the first sentence', () => {
    expect(splitHeadline('Design with purpose. Build with impact.')).toEqual({
      accent: 'Design',
      rest: 'with purpose.',
      second: 'Build with impact.',
    });
  });

  it('keeps a single sentence on one line', () => {
    expect(splitHeadline('  We build websites that   feel like the future. ')).toEqual({
      accent: 'We',
      rest: 'build websites that feel like the future.',
      second: '',
    });
  });

  it('handles a one-word headline and more than two sentences', () => {
    expect(splitHeadline('Hello')).toEqual({ accent: 'Hello', rest: '', second: '' });
    expect(splitHeadline('Fast! Accessible? Yes. Always.')).toEqual({
      accent: 'Fast!',
      rest: '',
      second: 'Accessible? Yes. Always.',
    });
  });
});
