import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from './cx.js';

/** ARIA wiring a form control needs to be linked to its label, hint and error. */
export interface FieldControlProps {
  readonly id: string;
  readonly 'aria-invalid': true | undefined;
  readonly 'aria-describedby': string | undefined;
  readonly 'aria-required': true | undefined;
}

export interface FieldProps {
  /** Id of the control; the hint (`${id}-hint`) and error (`${id}-error`) ids derive from it. */
  readonly id: string;
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  /** Validation message. When set, the control is marked `aria-invalid`. */
  readonly error?: string | undefined;
  readonly required?: boolean;
  readonly className?: string;
  /** Renders the control with the ARIA props spread onto it. */
  readonly children: (control: FieldControlProps) => ReactNode;
}

export function fieldHintId(id: string): string {
  return `${id}-hint`;
}

export function fieldErrorId(id: string): string {
  return `${id}-error`;
}

/**
 * Label + control + hint + error, wired with `aria-describedby` and `aria-invalid`
 * (WCAG 1.3.1, 3.3.1). The control is supplied through a render function so any
 * input, textarea or select (including React Hook Form's `register`) can be used.
 */
export function Field({ id, label, hint, error, required, className, children }: FieldProps) {
  const describedBy = [hint ? fieldHintId(id) : null, error ? fieldErrorId(id) : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-neon-cyan">
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
        'aria-required': required ? true : undefined,
      })}
      {hint ? (
        <p id={fieldHintId(id)} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={fieldErrorId(id)} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-fg ' +
  'placeholder:text-muted transition-colors duration-200 ' +
  'focus-visible:border-neon-cyan focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-neon-cyan aria-invalid:border-danger';

export function Input({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={cx(CONTROL, 'min-h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentPropsWithRef<'textarea'>) {
  return <textarea className={cx(CONTROL, 'min-h-32 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentPropsWithRef<'select'>) {
  return <select className={cx(CONTROL, 'min-h-11', className)} {...props} />;
}

export interface CheckboxFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'id'> {
  readonly id: string;
  readonly label: ReactNode;
  readonly error?: string | undefined;
}

/** Checkbox with its label to the right and an error message linked by `aria-describedby`. */
export function CheckboxField({ id, label, error, className, ...props }: CheckboxFieldProps) {
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? fieldErrorId(id) : undefined}
          className="mt-0.5 size-5 shrink-0 accent-neon-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan"
          {...props}
        />
        <label htmlFor={id} className="text-sm text-fg">
          {label}
        </label>
      </div>
      {error ? (
        <p id={fieldErrorId(id)} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
