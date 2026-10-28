import { cx } from '@agency/ui';

import { HeroArt } from './HeroArt';
import { LEFT_SPARKLES, RIGHT_SPARKLES, SparkleRow } from './HeroSparkles';

const TILES = Array.from({ length: 14 }, (_, index) => index);

/**
 * Rows of 130px outlined tiles, each faded out by a radial mask (an ellipse from the
 * design). Two rows sit under each other per group; positions are on the 1920px canvas.
 */
const GRID_ROWS = [
  // Bottom left, under the subtitle and buttons.
  'top-[490px] left-[29px] opacity-65 [mask-image:url(/images/hero/grid-mask-a.svg)] mask-position-[369px_-127px] mask-size-[972px_633px]',
  'top-[618px] left-[29px] opacity-65 [mask-image:url(/images/hero/grid-mask-b.svg)] mask-position-[417px_-183px] mask-size-[787px_496px]',
  // Top left, behind the accent word.
  'top-[172px] left-[-650px] opacity-56 [mask-image:url(/images/hero/grid-mask-c.svg)] mask-position-[319px_-127px] mask-size-[829px_513px]',
  'top-[300px] left-[-650px] opacity-56 [mask-image:url(/images/hero/grid-mask-b.svg)] mask-position-[353px_-284px] mask-size-[787px_496px]',
  // Top right, behind the end of the headline.
  'top-[198px] left-[820px] opacity-67 [mask-image:url(/images/hero/grid-mask-a.svg)] mask-position-[370px_-127px] mask-size-[972px_633px]',
  'top-[326px] left-[820px] opacity-67 [mask-image:url(/images/hero/grid-mask-b.svg)] mask-position-[443px_-183px] mask-size-[787px_496px]',
] as const;

/** One of the three light beams in the top left corner, tilted by `rotate`. */
function Beam({
  name,
  box,
  rotate,
  size,
  inset,
}: {
  readonly name: 'beam-a' | 'beam-b' | 'beam-c';
  readonly box: string;
  readonly rotate: string;
  readonly size: string;
  readonly inset: string;
}) {
  return (
    <div className={cx('absolute flex items-center justify-center mix-blend-plus-lighter', box)}>
      <div className={cx('flex-none', rotate)}>
        <div className={cx('hero-beam relative', size)}>
          <div className={cx('absolute', inset)}>
            <HeroArt name={name} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The hero background from the design: near-black with a blurred green ring, light
 * beams from the top left corner, faint tile grids and sparkles. Everything is drawn on
 * a 1920px canvas centred on the viewport (the design's width), so the picture is exact
 * at 1920px and crops evenly on narrower screens. Positioning uses `left`, never a
 * transform, so the blend modes keep the background as their backdrop. The beams
 * shimmer out of step (`hero-beam`, globals.css).
 */
export function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 bottom-(--hero-notch) overflow-clip rounded-b-[2rem] bg-[#080f0c] lg:rounded-b-[60px]"
    >
      <div className="absolute top-0 left-[calc(50%-960px)] h-[952px] w-[1920px]">
        <div className="absolute top-[-708px] left-[-295px] size-[2442px]">
          <div className="absolute inset-[-9.92%]">
            <HeroArt name="glow-ring" />
          </div>
        </div>
        <Beam
          name="beam-a"
          box="top-[-126px] left-[-48px] h-[489.444px] w-[482.579px]"
          rotate="rotate-[-44.41deg]"
          size="h-[578.605px] w-[108.756px]"
          inset="inset-[-3.15%_-16.73%]"
        />
        <Beam
          name="beam-b"
          box="top-[-225px] left-[-371px] h-[591.636px] w-[450.308px] [--beam-delay:2.3s]"
          rotate="rotate-[-33.29deg]"
          size="h-[622.487px] w-[129.926px]"
          inset="inset-[-2.1%_-10.08%]"
        />
        <Beam
          name="beam-c"
          box="top-[-172.73px] left-[-264.09px] h-[580.267px] w-[542.175px] [--beam-delay:4.6s]"
          rotate="rotate-[-41.57deg]"
          size="h-[622.487px] w-[172.625px]"
          inset="inset-[-2.1%_-7.59%]"
        />
        {GRID_ROWS.map((row) => (
          <div
            key={row}
            className={cx(
              'absolute flex w-[1820px] mask-alpha mask-intersect mask-no-clip mask-no-repeat',
              row,
            )}
          >
            <div className="flex w-full items-center opacity-47">
              {TILES.map((tile) => (
                <div key={tile} className="size-[130px] shrink-0 border border-white/25" />
              ))}
            </div>
          </div>
        ))}
        <SparkleRow art={RIGHT_SPARKLES} className="top-[276px] left-[1323px] [--row-delay:0.9s]" />
        <SparkleRow art={LEFT_SPARKLES} className="top-[252px] left-[-20px] [--row-delay:1.7s]" />
      </div>
      <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_-20px_10px_rgb(0_0_0/0.25)]" />
    </div>
  );
}
