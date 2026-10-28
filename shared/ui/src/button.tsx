import type { ComponentPropsWithRef } from 'react';

import { cx } from './cx.js';

export type ButtonVariant = 'primary' | 'ghost';
export type ButtonSize = 'md' | 'lg';

export interface ButtonStyleOptions {
  readonly variant?: ButtonVariant | undefined;
  readonly size?: ButtonSize | undefined;
  readonly className?: string | undefined;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-display font-medium ' +
  'transition-[transform,opacity,background-color,border-color] duration-200 ease-futuristic ' +
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon-cyan ' +
  'disabled:cursor-not-allowed disabled:opacity-60 motion-safe:active:scale-[0.98]';

const VARIANTS: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-neon-cyan text-bg hover:bg-neon-cyan/90',
  ghost: 'border border-border text-fg hover:border-neon-cyan hover:bg-surface',
};

const SIZES: Readonly<Record<ButtonSize, string>> = {
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-7 text-base',
};

/**
 * Class names for a button-styled element. Use it to style framework links
 * (`<Link className={buttonClassName({ variant: 'ghost' })}>`) without a wrapper.
 */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonStyleOptions = {}): string {
  return cx(BASE, VARIANTS[variant], SIZES[size], className);
}

export type ButtonProps = ComponentPropsWithRef<'button'> & Omit<ButtonStyleOptions, 'className'>;

/** Native `<button>`; defaults to `type="button"` so it never submits a form by accident. */
export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClassName({ variant, size, className })} {...props} />
  );
}

export type ButtonLinkProps = ComponentPropsWithRef<'a'> &
  Omit<ButtonStyleOptions, 'className'> & { readonly href: string };

/** Plain `<a>` styled as a button, for external or non-routed links. */
export function ButtonLink({ variant, size, className, children, ...props }: ButtonLinkProps) {
  return (
    <a className={buttonClassName({ variant, size, className })} {...props}>
      {children}
    </a>
  );
}
