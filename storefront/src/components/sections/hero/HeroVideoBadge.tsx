import { HeroArt } from './HeroArt';
import { HeroVideoButton } from './HeroVideoButton';

/**
 * "watch video" twice around the disc, letter by letter as placed in the design:
 * [letter, left, top, width, height, rotation in degrees] in the 218px disc.
 */
const LETTERS = [
  ['w', 12, 47, 36.294, 33.328, -55.07],
  ['a', 29.92, 30.31, 30.997, 32.515, -41.38],
  ['t', 47.92, 20.02, 24.372, 31.779, -30.56],
  ['c', 64.71, 11.25, 23.646, 33.907, -19.74],
  ['h', 87.23, 7.11, 17.997, 32.586, -7.64],
  ['v', 119.12, 8.08, 19.054, 33.001, 11.78],
  ['i', 135.14, 13.4, 16.715, 31.09, 21.01],
  ['d', 143.97, 19.06, 29.743, 34.805, 31.19],
  ['e', 159.96, 33.45, 31.589, 32.039, 43.93],
  ['o', 172.03, 50.6, 34.117, 29.667, 56.34],
  ['w', 169.85, 137, 36.294, 33.328, 124.93],
  ['a', 157.23, 154.5, 30.997, 32.515, 138.62],
  ['t', 145.85, 165.53, 24.372, 31.779, 149.44],
  ['c', 129.79, 172.17, 23.646, 33.907, 160.26],
  ['h', 112.92, 177.63, 17.997, 32.586, 172.36],
  ['v', 79.97, 176.25, 19.054, 33.001, -168.22],
  ['i', 66.29, 172.84, 16.715, 31.09, -158.99],
  ['d', 44.43, 163.47, 29.743, 34.805, -148.81],
  ['e', 26.6, 151.84, 31.589, 32.039, -136.07],
  ['o', 12, 137.06, 34.117, 29.667, -123.66],
] as const;

/**
 * The round "watch video" badge centred on the bottom edge of the hero background
 * (`--hero-notch` above the section's bottom), tilted as in the design. It fades up
 * last in the hero's entrance.
 */
export function HeroVideoBadge({ videoId }: { readonly videoId: string }) {
  return (
    <div
      data-fade-in=""
      className="absolute top-[calc(100%-var(--hero-notch))] left-[calc(50%-109px)] size-[218px] -translate-y-1/2 [--fade-delay:0.6s]"
    >
      <HeroVideoButton
        videoId={videoId}
        label="Watch video"
        className="group block size-full rounded-full"
      >
        <span className="relative block size-full rotate-[-20.45deg]">
          <span className="absolute inset-0">
            <HeroArt name="badge-disc" />
          </span>
          {/* The lettering and dots turn slowly around the disc; the play icon stays put. */}
          <span className="hero-spin absolute inset-0">
            {LETTERS.map(([letter, left, top, width, height, rotate]) => (
              <span
                key={`${String(left)}-${String(top)}`}
                aria-hidden="true"
                className="absolute flex items-center justify-center"
                style={{ left, top, width, height }}
              >
                <span
                  className="flex-none font-hero text-[24px] leading-normal font-normal whitespace-nowrap text-white [font-variation-settings:'opsz'_14]"
                  style={{ rotate: `${String(rotate)}deg` }}
                >
                  {letter}
                </span>
              </span>
            ))}
            <span className="absolute top-[106px] left-[15px] size-[12px]">
              <HeroArt name="badge-dot" />
            </span>
            <span className="absolute top-[106px] left-[192px] size-[12px]">
              <HeroArt name="badge-dot" />
            </span>
          </span>
          <span className="absolute top-[58px] left-[62px] size-[108px] transition-transform duration-300 group-hover:scale-110">
            <HeroArt name="badge-play" />
          </span>
        </span>
      </HeroVideoButton>
    </div>
  );
}
