import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { easeOutCubic, formatStat } from './format-stat';
import { StatCounter } from './StatCounter';
import { YouTubeFacade, youtubeEmbedUrl } from './YouTubeFacade';

describe('formatStat', () => {
  it('formats with fixed decimals and a suffix', () => {
    expect(formatStat(1234.56, 1, '+')).toBe('1,234.6+');
    expect(formatStat(98, 0, '%')).toBe('98%');
    expect(formatStat(4.9, 1, '')).toBe('4.9');
  });

  it('eases out and clamps the progress', () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(0.5)).toBe(0.875);
    expect(easeOutCubic(2)).toBe(1);
  });
});

describe('YouTubeFacade', () => {
  it('builds a privacy-enhanced embed URL', () => {
    expect(youtubeEmbedUrl('aqz-KE-bpKQ')).toBe(
      'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0',
    );
  });

  it('loads the player only after the visitor asks for it, then focuses it', async () => {
    render(
      <YouTubeFacade videoId="aqz-KE-bpKQ" title="Priya, Vertex Freight">
        <span>poster</span>
      </YouTubeFacade>,
    );
    expect(document.querySelector('iframe')).toBeNull();

    await userEvent.click(
      screen.getByRole('button', { name: 'Play video: Priya, Vertex Freight' }),
    );

    const frame = screen.getByTitle('Priya, Vertex Freight');
    expect(frame).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0',
    );
    expect(frame).toHaveFocus();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('StatCounter', () => {
  type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;
  let observerCallback: ObserverCallback | undefined;
  let reducedMotion = false;

  beforeEach(() => {
    observerCallback = undefined;
    reducedMotion = false;
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: reducedMotion && query.includes('reduce') })),
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: ObserverCallback) {
          observerCallback = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    // Below the fold at hydration, so the counter is armed.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 5000,
      bottom: 5100,
    } as DOMRect);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the final value for assistive technology while the copy counts up', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] });
    render(<StatCounter value={120} decimals={0} suffix="+" />);
    const [animated, accessible] = screen.getAllByText(/\+$/);
    expect(accessible).toHaveClass('sr-only');
    expect(accessible).toHaveTextContent('120+');
    expect(animated).toHaveTextContent('0+');

    act(() => {
      observerCallback?.([{ isIntersecting: true }]);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(animated).toHaveTextContent('120+');
  });

  it('shows the final value without animating under reduced motion', () => {
    reducedMotion = true;
    render(<StatCounter value={98} decimals={0} suffix="%" />);
    for (const element of screen.getAllByText('98%')) expect(element).toBeInTheDocument();
    expect(observerCallback).toBeUndefined();
  });
});
