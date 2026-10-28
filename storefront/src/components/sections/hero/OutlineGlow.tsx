/**
 * The outline buttons of the hero design ("Contact Us", "Explore Our Work"): a black
 * 1px stroke and white text under two inner shadows, white and lime. In the design the
 * shadows act on the button's whole content, which is what turns the stroke and the
 * letters lime, so they are applied as an SVG filter (the design's own filter chain)
 * rather than a box-shadow. `OutlineGlowFilter` must be rendered once on the page.
 */
export const OUTLINE_BUTTON =
  "inline-flex items-center justify-center rounded-[46px] border border-black px-[40px] font-hero leading-[1.64] whitespace-nowrap text-white [font-variation-settings:'opsz'_14] [filter:url(#hero-outline-glow)] transition-[background-color] hover:bg-[#c4ff79]/10";

const HARD_ALPHA = '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0';

export function OutlineGlowFilter() {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute size-0">
      <filter
        id="hero-outline-glow"
        x="-10%"
        y="-20%"
        width="120%"
        height="150%"
        colorInterpolationFilters="sRGB"
      >
        {/* Drop shadow: 0 4px 4px rgb(0 0 0 / 0.25). */}
        <feFlood floodOpacity="0" result="BackgroundImageFix" />
        <feColorMatrix in="SourceAlpha" type="matrix" values={HARD_ALPHA} result="hardAlpha" />
        <feOffset dy="4" />
        <feGaussianBlur stdDeviation="2" />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <feBlend mode="normal" in2="BackgroundImageFix" result="dropShadow" />
        <feBlend mode="normal" in="SourceGraphic" in2="dropShadow" result="shape" />
        {/* Inner shadows, bounded by the real (anti-aliased) coverage rather than the
            design's hard alpha, which in browsers thickens the letters by a pixel. */}
        {/* Inner shadow: 0 4px 14.8px white at 25%. */}
        <feOffset in="SourceAlpha" dy="4" />
        <feGaussianBlur stdDeviation="7.4" />
        <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
        <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
        <feBlend mode="normal" in2="shape" result="whiteGlow" />
        {/* Inner shadow: 0 4px 19.6px #c4ff79. */}
        <feOffset in="SourceAlpha" dy="4" />
        <feGaussianBlur stdDeviation="9.8" />
        <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.768627 0 0 0 0 1 0 0 0 0 0.47451 0 0 0 1 0"
        />
        <feBlend mode="normal" in2="whiteGlow" />
      </filter>
    </svg>
  );
}
