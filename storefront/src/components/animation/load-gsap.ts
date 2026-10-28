import type { gsap as GsapInstance } from 'gsap';
import type { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger';

export interface GsapModules {
  readonly gsap: typeof GsapInstance;
  readonly ScrollTrigger: typeof ScrollTriggerPlugin;
}

let pending: Promise<GsapModules> | undefined;

/**
 * Loads GSAP and ScrollTrigger once, on demand. Keeping them out of the static
 * import graph saves ~44 KB gzip of first-load JavaScript (doc §6.9 budget).
 */
export function loadGsap(): Promise<GsapModules> {
  pending ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
    ([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger);
      return { gsap, ScrollTrigger };
    },
  );
  return pending;
}
