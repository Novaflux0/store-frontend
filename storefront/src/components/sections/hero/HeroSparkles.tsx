import { cx } from '@agency/ui';

import { HeroArt, type HeroArtName } from './HeroArt';

/** A short horizontal ray of light, 100px wide. */
function Ray({ name, className }: { readonly name: HeroArtName; readonly className: string }) {
  return (
    <div className={cx('absolute h-0 w-[100px] mix-blend-color-dodge', className)}>
      <div className="absolute inset-[-1.7px_-1.2%]">
        <HeroArt name={name} />
      </div>
    </div>
  );
}

/** `className` places the star and sets its `--twinkle-delay`. */
function SmallStar({ className }: { readonly className: string }) {
  return (
    <div className={cx('hero-twinkle absolute size-[16px] mix-blend-plus-lighter', className)}>
      <div className="absolute inset-[-14.37%]">
        <HeroArt name="sparkle-star-small" />
      </div>
    </div>
  );
}

/** What one row of sparkles shows; the three rows of the design differ only in these. */
export interface SparkleRowArt {
  /** The upright ray through the centre star. */
  readonly verticalRay: HeroArtName;
  readonly star: 'sparkle-star' | 'sparkle-star-dim';
  /** The soft flare right of the centre, optionally with a small star left of it. */
  readonly flare?: { readonly star: boolean };
  readonly left?: { readonly ray?: HeroArtName };
  readonly right?: { readonly ray?: HeroArtName };
  readonly centreRay?: HeroArtName;
}

/**
 * A 522 x 100 row of glowing stars joined by rays, as drawn in the design. The layers
 * blend (plus-lighter, colour-dodge ...) with whatever is behind them, so no ancestor
 * between the row and the hero background may create a stacking context. The stars
 * twinkle out of step; `className` can offset the whole row with `--row-delay`.
 */
export function SparkleRow({
  art,
  className,
}: {
  readonly art: SparkleRowArt;
  readonly className: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cx('pointer-events-none absolute h-[100px] w-[522px]', className)}
    >
      <div className="absolute top-0 left-[278px] flex h-[100px] w-0 items-center justify-center mix-blend-hard-light">
        <div className="flex-none -rotate-90">
          <div className="relative h-0 w-[100px]">
            <div className="absolute inset-[-1.7px_-1.2%]">
              <HeroArt name={art.verticalRay} />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-[30.99px] left-0 h-[40px] w-[522px]">
        <div className="absolute top-0 left-[241px] h-[40px] w-[74px] mix-blend-soft-light">
          <div className="absolute inset-[-10%_-5.41%]">
            <HeroArt name="sparkle-burst" />
          </div>
        </div>
        <div className="absolute top-[4px] left-[262px] size-[32px]">
          <div className="hero-twinkle absolute top-[6px] left-[6px] size-[20px] mix-blend-plus-lighter [--twinkle-delay:0.4s]">
            <div className="absolute inset-[-11.5%]">
              <HeroArt name={art.star} />
            </div>
          </div>
        </div>
        {art.flare ? (
          <div className="absolute top-[4px] left-[132px] size-[32px]">
            <div className="absolute top-[-18px] left-[84px] h-[68px] w-[124px] mix-blend-color-dodge">
              <div className="absolute inset-[-21.32%_-11.69%]">
                <HeroArt name="sparkle-flare" />
              </div>
            </div>
            {art.flare.star ? (
              <SmallStar className="top-[8px] left-[8px] [--twinkle-delay:1.6s]" />
            ) : null}
          </div>
        ) : null}
        {art.left ? (
          <div className="absolute top-[4px] left-0 h-[32px] w-[131px]">
            <SmallStar className="top-[8px] left-[10px] [--twinkle-delay:1s]" />
            {art.left.ray ? <Ray name={art.left.ray} className="top-[15px] left-[31px]" /> : null}
          </div>
        ) : null}
        {art.right ? (
          <div className="absolute top-[4px] left-[391px] h-[32px] w-[131px]">
            <SmallStar className="top-[8px] left-[9px] [--twinkle-delay:2.2s]" />
            {art.right.ray ? <Ray name={art.right.ray} className="top-[15px] left-[31px]" /> : null}
          </div>
        ) : null}
        {art.centreRay ? <Ray name={art.centreRay} className="top-[19px] left-[228px]" /> : null}
      </div>
    </div>
  );
}

/** Between the subtitle and the buttons. */
export const CENTRE_SPARKLES: SparkleRowArt = {
  verticalRay: 'sparkle-ray-v-a',
  star: 'sparkle-star',
  flare: { star: true },
  left: { ray: 'sparkle-ray-h-a' },
  right: { ray: 'sparkle-ray-h-a' },
  centreRay: 'sparkle-ray-h-b',
};

/** Right of the headline's first line. */
export const RIGHT_SPARKLES: SparkleRowArt = {
  verticalRay: 'sparkle-ray-v-b',
  star: 'sparkle-star',
  flare: { star: false },
  right: {},
  centreRay: 'sparkle-ray-h-c',
};

/** Left of the headline's first line. */
export const LEFT_SPARKLES: SparkleRowArt = {
  verticalRay: 'sparkle-ray-v-c',
  star: 'sparkle-star-dim',
  left: { ray: 'sparkle-ray-h-c' },
};
