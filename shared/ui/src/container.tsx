import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from './cx.js';

export type ContainerElement = 'div' | 'section' | 'header' | 'footer' | 'main' | 'nav' | 'article';

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  /** Rendered element; defaults to `div`. */
  readonly as?: ContainerElement;
  readonly children?: ReactNode;
}

/**
 * Minimum side spacing per screen width (16 / 20 / 24 / 32 / 40 / 64 / 80px from below
 * 375px up to 1536px and above). The column fills the screen up to 1920px wide (content
 * 1760px at the 80px gutter), then stays centred.
 */
const GUTTER =
  '[--gutter:1rem] min-[375px]:[--gutter:1.25rem] min-[480px]:[--gutter:1.5rem] md:[--gutter:2rem] lg:[--gutter:2.5rem] xl:[--gutter:4rem] 2xl:[--gutter:5rem]';

/** Centred, width-limited page column with responsive side gutters. */
export function Container({ as: Tag = 'div', className, ...props }: ContainerProps) {
  return (
    <Tag
      className={cx('mx-auto w-full max-w-[120rem] px-(--gutter)', GUTTER, className)}
      {...props}
    />
  );
}
