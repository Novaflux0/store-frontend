import type { ReactNode } from 'react';

import { cx } from '@agency/ui';

import type { ServiceKey } from '@/content/services';
import type { ServiceOption } from '@agency/validation/constants';

interface Art {
  /** Card background: a bright gradient, like a product shot on a coloured backdrop. */
  readonly backdrop: string;
  readonly art: ReactNode;
}

const INK = '#0b0d14';
const PAPER = '#ffffff';

/** Rounded bars standing in for lines of text. */
function Lines({
  x,
  y,
  widths,
  gap = 14,
  height = 7,
  fill = INK,
  opacity = 0.2,
}: {
  readonly x: number;
  readonly y: number;
  readonly widths: readonly number[];
  readonly gap?: number;
  readonly height?: number;
  readonly fill?: string;
  readonly opacity?: number;
}) {
  return (
    <g fill={fill} opacity={opacity}>
      {widths.map((width, i) => (
        <rect key={i} x={x} y={y + i * gap} width={width} height={height} rx={height / 2} />
      ))}
    </g>
  );
}

/** Syntax-coloured tokens (width, colour) of the code editor illustration, per line. */
const CODE_LINES: readonly {
  readonly indent: number;
  readonly tokens: readonly (readonly [number, string])[];
}[] = [
  {
    indent: 0,
    tokens: [
      [54, '#c084fc'],
      [80, '#e5e7eb'],
    ],
  },
  {
    indent: 12,
    tokens: [
      [40, '#38bdf8'],
      [110, '#fdba74'],
    ],
  },
  {
    indent: 12,
    tokens: [
      [70, '#e5e7eb'],
      [60, '#86efac'],
    ],
  },
  {
    indent: 24,
    tokens: [
      [46, '#fdba74'],
      [96, '#e5e7eb'],
    ],
  },
  {
    indent: 24,
    tokens: [
      [84, '#86efac'],
      [50, '#38bdf8'],
    ],
  },
  {
    indent: 12,
    tokens: [
      [36, '#c084fc'],
      [72, '#e5e7eb'],
    ],
  },
  { indent: 0, tokens: [[30, '#e5e7eb']] },
  {
    indent: 0,
    tokens: [
      [60, '#38bdf8'],
      [90, '#fdba74'],
    ],
  },
  {
    indent: 12,
    tokens: [
      [52, '#e5e7eb'],
      [64, '#86efac'],
    ],
  },
];

/**
 * Two illustrations per service, drawn in SVG so they are crisp, tiny and need no
 * stock photos. Swap any of them for a real project shot when one is ready.
 */
const ART: Record<ServiceKey, readonly [Art, Art]> = {
  'web-design': [
    {
      backdrop: 'bg-[linear-gradient(160deg,#bfdbfe,#3b82f6)]',
      art: (
        <g>
          <rect x="24" y="96" width="272" height="208" rx="14" fill={PAPER} />
          <circle cx="42" cy="114" r="4" fill="#f87171" />
          <circle cx="56" cy="114" r="4" fill="#fbbf24" />
          <circle cx="70" cy="114" r="4" fill="#34d399" />
          <rect x="40" y="140" width="120" height="14" rx="7" fill={INK} />
          <rect x="40" y="160" width="96" height="14" rx="7" fill="#3b82f6" />
          <Lines x={40} y={186} widths={[110, 90, 100]} gap={12} height={6} />
          <rect x="40" y="232" width="62" height="20" rx="10" fill="#3b82f6" />
          <rect x="176" y="136" width="104" height="120" rx="10" fill="#dbeafe" />
          <circle cx="228" cy="184" r="22" fill="#93c5fd" />
          <rect x="196" y="222" width="64" height="8" rx="4" fill="#60a5fa" />
          <rect x="40" y="270" width="240" height="18" rx="6" fill="#eff6ff" />
        </g>
      ),
    },
    {
      backdrop: 'bg-[linear-gradient(160deg,#ecfccb,#84cc16)]',
      art: (
        <g>
          <rect x="92" y="44" width="136" height="300" rx="28" fill={INK} />
          <rect x="102" y="56" width="116" height="276" rx="20" fill="#1c2130" />
          <rect x="140" y="62" width="40" height="8" rx="4" fill={INK} />
          <rect x="114" y="88" width="92" height="56" rx="12" fill="#bef264" />
          <rect x="124" y="100" width="40" height="6" rx="3" fill={INK} opacity="0.6" />
          <rect x="124" y="124" width="56" height="8" rx="4" fill={INK} />
          <Lines
            x={114}
            y={160}
            widths={[92, 70]}
            gap={14}
            height={8}
            fill={PAPER}
            opacity={0.35}
          />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle cx="124" cy={208 + i * 36} r="10" fill="#bef264" opacity={0.9 - i * 0.2} />
              <rect
                x="142"
                y={202 + i * 36}
                width="48"
                height="6"
                rx="3"
                fill={PAPER}
                opacity="0.6"
              />
              <rect
                x="142"
                y={212 + i * 36}
                width="30"
                height="5"
                rx="2.5"
                fill={PAPER}
                opacity="0.3"
              />
            </g>
          ))}
        </g>
      ),
    },
  ],
  'web-development': [
    {
      backdrop: 'bg-[linear-gradient(160deg,#fed7aa,#f97316)]',
      art: (
        <g>
          <rect x="24" y="84" width="272" height="232" rx="14" fill="#16181f" />
          <circle cx="42" cy="102" r="4" fill="#f87171" />
          <circle cx="56" cy="102" r="4" fill="#fbbf24" />
          <circle cx="70" cy="102" r="4" fill="#34d399" />
          {CODE_LINES.map(({ indent, tokens }, i) => {
            let x = 60 + indent;
            return (
              <g key={i}>
                <rect x="40" y={128 + i * 18} width="10" height="6" rx="3" fill="#4b5563" />
                {tokens.map(([width, color], j) => {
                  const token = (
                    <rect
                      key={j}
                      x={x}
                      y={128 + i * 18}
                      width={width}
                      height="6"
                      rx="3"
                      fill={color}
                      opacity={j === 0 ? 1 : 0.8}
                    />
                  );
                  x += width + 6;
                  return token;
                })}
              </g>
            );
          })}
        </g>
      ),
    },
    {
      backdrop: 'bg-[linear-gradient(160deg,#fef08a,#eab308)]',
      art: (
        <g>
          <rect x="40" y="70" width="240" height="260" rx="18" fill={PAPER} />
          <rect x="60" y="92" width="110" height="12" rx="6" fill={INK} />
          <Lines x={60} y={112} widths={[150]} height={6} />
          {['Build', 'Tests', 'Lighthouse', 'Deploy'].map((step, i) => (
            <g key={step}>
              <rect x="56" y={140 + i * 44} width="208" height="34" rx="10" fill="#fefce8" />
              <circle cx="76" cy={157 + i * 44} r="9" fill="#22c55e" />
              <path
                d={`M71.5 ${157 + i * 44} l3 3 l5.5 -6`}
                fill="none"
                stroke={PAPER}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="94"
                y={153 + i * 44}
                width={70 + (i % 2) * 24}
                height="8"
                rx="4"
                fill={INK}
                opacity="0.7"
              />
              <rect
                x="226"
                y={153 + i * 44}
                width="26"
                height="8"
                rx="4"
                fill="#22c55e"
                opacity="0.5"
              />
            </g>
          ))}
        </g>
      ),
    },
  ],
  '3d-experiences': [
    {
      backdrop: 'bg-[linear-gradient(160deg,#ddd6fe,#7c3aed)]',
      art: (
        <g fill="none" stroke={PAPER} strokeLinejoin="round">
          <ellipse cx="160" cy="320" rx="96" ry="18" fill={INK} stroke="none" opacity="0.18" />
          <path d="M160 92 L262 150 L262 266 L160 324 L58 266 L58 150 Z" strokeWidth="2.5" />
          <path d="M58 150 L160 208 L262 150 M160 208 L160 324" strokeWidth="2.5" />
          <path
            d="M109 121 L211 179 M211 121 L109 179 M58 208 L160 266 L262 208 M109 179 L109 295 M211 179 L211 295"
            strokeWidth="1.2"
            opacity="0.55"
          />
          <path
            d="M160 92 L262 150 L160 208 L58 150 Z"
            fill={PAPER}
            fillOpacity="0.3"
            stroke="none"
          />
          {[
            [160, 92],
            [262, 150],
            [262, 266],
            [160, 324],
            [58, 266],
            [58, 150],
            [160, 208],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill={PAPER} stroke="none" />
          ))}
        </g>
      ),
    },
    {
      backdrop: 'bg-[linear-gradient(160deg,#cffafe,#06b6d4)]',
      art: (
        <g>
          <defs>
            <radialGradient id="service-art-sphere" cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor={PAPER} />
              <stop offset="0.45" stopColor="#67e8f9" />
              <stop offset="1" stopColor="#0e7490" />
            </radialGradient>
          </defs>
          <ellipse cx="160" cy="262" rx="78" ry="14" fill={INK} opacity="0.2" />
          <circle cx="160" cy="176" r="84" fill="url(#service-art-sphere)" />
          <rect x="60" y="296" width="200" height="56" rx="28" fill={PAPER} opacity="0.92" />
          {['#0e7490', '#7c3aed', '#f97316', '#0b0d14'].map((color, i) => (
            <circle
              key={color}
              cx={98 + i * 42}
              cy="324"
              r="14"
              fill={color}
              stroke={i === 0 ? INK : 'none'}
              strokeWidth="3"
            />
          ))}
        </g>
      ),
    },
  ],
  branding: [
    {
      backdrop: 'bg-[linear-gradient(160deg,#34d399,#065f46)]',
      art: (
        <g>
          <path d="M112 236 L112 140 L208 140 Z" fill="#d9f99d" />
          <path d="M128 252 L224 252 L224 156 Z" fill={PAPER} />
          <rect x="88" y="290" width="144" height="16" rx="8" fill={PAPER} />
          <rect x="116" y="316" width="88" height="8" rx="4" fill={PAPER} opacity="0.55" />
          <g fill={PAPER} opacity="0.18">
            <rect x="-20" y="60" width="380" height="18" rx="9" transform="rotate(-18 160 69)" />
            <rect x="-20" y="372" width="380" height="18" rx="9" transform="rotate(-18 160 381)" />
          </g>
        </g>
      ),
    },
    {
      backdrop: 'bg-[linear-gradient(160deg,#fbcfe8,#ec4899)]',
      art: (
        <g>
          <rect x="40" y="64" width="240" height="272" rx="18" fill={PAPER} />
          <text x="64" y="170" fill={INK} fontSize="84" fontStyle="italic" className="font-serif">
            Aa
          </text>
          <Lines x={64} y={190} widths={[120, 90]} height={7} />
          {['#0b0d14', '#ec4899', '#fbcfe8', '#065f46', '#d9f99d'].map((color, i) => (
            <rect
              key={color}
              x={64 + i * 40}
              y="244"
              width="32"
              height="64"
              rx="10"
              fill={color}
              stroke="#e5e7eb"
            />
          ))}
        </g>
      ),
    },
  ],
  seo: [
    {
      backdrop: 'bg-[linear-gradient(160deg,#c7d2fe,#4f46e5)]',
      art: (
        <g>
          <rect x="40" y="76" width="240" height="248" rx="18" fill={PAPER} />
          <circle cx="160" cy="172" r="56" fill="#ecfdf5" />
          <circle
            cx="160"
            cy="172"
            r="56"
            fill="none"
            stroke="#22c55e"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <text
            x="160"
            y="188"
            textAnchor="middle"
            fill="#15803d"
            fontSize="44"
            fontWeight="700"
            className="font-display"
          >
            100
          </text>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle
                cx={100 + i * 60}
                cy="280"
                r="18"
                fill="none"
                stroke="#22c55e"
                strokeWidth="5"
              />
              <rect
                x={88 + i * 60}
                y="306"
                width="24"
                height="5"
                rx="2.5"
                fill={INK}
                opacity="0.25"
              />
            </g>
          ))}
        </g>
      ),
    },
    {
      backdrop: 'bg-[linear-gradient(160deg,#d1fae5,#10b981)]',
      art: (
        <g>
          <rect x="32" y="64" width="256" height="112" rx="16" fill={PAPER} />
          <rect x="48" y="82" width="92" height="7" rx="3.5" fill="#10b981" />
          <rect x="48" y="98" width="180" height="12" rx="6" fill="#1d4ed8" />
          <Lines x={48} y={122} widths={[220, 190, 140]} gap={13} height={6} />
          <rect x="32" y="192" width="256" height="144" rx="16" fill={PAPER} />
          {[36, 52, 48, 70, 84, 102].map((height, i) => (
            <rect
              key={i}
              x={56 + i * 36}
              y={318 - height}
              width="22"
              height={height}
              rx="6"
              fill="#10b981"
              opacity={0.45 + i * 0.1}
            />
          ))}
          <path
            d="M67 262 L103 246 L139 250 L175 226 L211 212 L247 192"
            fill="none"
            stroke={INK}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ),
    },
  ],
};

export interface ServiceArtProps {
  /** `other` (a service without its own artwork) uses the web development cards. */
  readonly service: ServiceOption;
  readonly index: 0 | 1;
  readonly className?: string;
}

/** A tall, rounded illustration card for the services section. Decorative. */
export function ServiceArt({ service, index, className }: ServiceArtProps) {
  const { backdrop, art } = ART[service === 'other' ? 'web-development' : service][index];
  return (
    <div
      aria-hidden="true"
      className={cx(
        'relative aspect-[5/7] overflow-hidden rounded-3xl shadow-[0_24px_60px_-28px_rgb(0_0_0/0.7)]',
        backdrop,
        className,
      )}
    >
      <svg
        viewBox="0 0 320 400"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 size-full"
      >
        {art}
      </svg>
    </div>
  );
}
