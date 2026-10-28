import { cx } from '@agency/ui';

import { StaticImage } from '@/components/media/StaticImage';

/**
 * The hero's decorative SVGs, exported as-is from the Figma design, with their root
 * sizes. Most draw a blur or glow past their layer box, so they are placed in
 * wrappers with the negative insets the design gives them.
 */
const ART = {
  'glow-ring': [2926.4, 2926.4],
  'beam-a': [145.156, 615.005],
  'beam-b': [156.126, 648.687],
  'beam-c': [198.825, 648.687],
  'sparkle-burst': [82, 48],
  'sparkle-star': [24.6, 24.6],
  'sparkle-star-dim': [24.6, 24.6],
  'sparkle-star-small': [20.6, 20.6],
  'sparkle-flare': [153, 97],
  'sparkle-ray-v-a': [102.4, 3.4],
  'sparkle-ray-v-b': [102.4, 3.4],
  'sparkle-ray-v-c': [102.4, 3.4],
  'sparkle-ray-h-a': [102.4, 3.4],
  'sparkle-ray-h-b': [102.4, 3.4],
  'sparkle-ray-h-c': [102.4, 3.4],
  notch: [284, 142],
  'badge-glow': [926.6, 562.6],
  'badge-disc': [218, 218],
  'badge-dot': [12, 12],
  'badge-play': [108, 108],
  'arrow-up-right': [67.0461, 46.1658],
} as const satisfies Record<string, readonly [number, number]>;

export type HeroArtName = keyof typeof ART;

/** One decorative SVG (empty alt): `size-full` of its wrapper unless `className` says otherwise. */
export function HeroArt({
  name,
  className,
}: {
  readonly name: HeroArtName;
  readonly className?: string;
}) {
  const [width, height] = ART[name];
  return (
    <StaticImage
      src={`/images/hero/${name}.svg`}
      alt=""
      width={width}
      height={height}
      className={cx('block size-full max-w-none', className)}
    />
  );
}
