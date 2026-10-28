'use client';

import { useEffect, useState } from 'react';

import { cx } from '@agency/ui';

import { BackToTopIcon } from './NavIcons';

/** Shown once the visitor has scrolled about one screen down. */
const SHOW_AFTER_PX = 480;

/**
 * Bottom-right "Back to Top". A plain link to `#main` (which starts at the top of the
 * page), so it works without JavaScript; Lenis (`anchors: true`) smooth-scrolls it
 * unless the visitor prefers reduced motion. Hidden (and out of the tab order) near
 * the top of the page. Below `xl` it is an icon above the bar, where the labelled pill
 * would collide with the centred navigation. It stays below the bar's layer (z-40 vs
 * z-50), so an open "More" menu covers it.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <a
      href="#main"
      className={cx(
        'nav-inverse rim-light fixed right-4 bottom-24 z-40 flex size-11 items-center justify-center rounded-full border border-nav-edge bg-nav text-nav-fg shadow-[0_10px_28px_-10px_rgb(0_0_0/0.7)]',
        'transition-[opacity,translate,visibility,filter] duration-300 ease-futuristic hover:brightness-125',
        'md:right-6 xl:bottom-9 xl:size-auto xl:min-h-12 xl:gap-2.5 xl:pr-6 xl:pl-3 xl:font-display xl:text-[0.9375rem]',
        visible ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 opacity-0',
      )}
    >
      <BackToTopIcon className="size-6" />
      <span className="max-xl:sr-only">Back to Top</span>
    </a>
  );
}
