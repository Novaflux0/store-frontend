'use client';

import Link from 'next/link';
import { useCallback, useId, useRef, useState, type SyntheticEvent } from 'react';

import { Button, Input, fieldErrorId } from '@agency/ui';
import { FIELD_LIMITS } from '@agency/validation/constants';

import {
  NEWSLETTER_MESSAGES,
  type NewsletterSubscribeResult,
} from '@/app/(marketing)/newsletter/newsletter-result';
import { HoneypotField } from '@/components/sections/HoneypotField';
import { Turnstile, type TurnstileHandle } from '@/components/sections/Turnstile';
import { ACTION_MESSAGES } from '@/lib/forms/action-result';
import { toast } from '@/lib/toast';

export type SubscribeNewsletterAction = (
  input: { email: string; turnstileToken: string; extraNote?: string },
  idempotencyKey: string,
) => Promise<NewsletterSubscribeResult>;

export interface NewsletterFormProps {
  readonly action: SubscribeNewsletterAction;
  readonly turnstileSiteKey: string;
}

interface FieldErrors {
  readonly email?: string | undefined;
  readonly turnstileToken?: string | undefined;
}

type Status =
  | { readonly type: 'idle' }
  | { readonly type: 'submitting' }
  | { readonly type: 'success' }
  | { readonly type: 'error'; readonly message: string };

/** Loose browser-side check; the Server Action validates with the shared schema. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newIdempotencyKey(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : '';
}

/**
 * Footer newsletter sign-up. Deliberately small (no form library, no Zod) because it
 * is on every page. The Turnstile script is loaded only once the visitor focuses or
 * touches the form, so pages that nobody subscribes from never load it.
 */
export function NewsletterForm({ action, turnstileSiteKey }: NewsletterFormProps) {
  const id = useId();
  const emailId = `${id}-email`;
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const turnstileRef = useRef<TurnstileHandle>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const idempotencyRef = useRef<{ key: string; email: string } | null>(null);

  const arm = useCallback(() => {
    setArmed(true);
  }, []);
  const onToken = useCallback((value: string) => {
    setToken(value);
    setErrors((current) => ({ ...current, turnstileToken: undefined }));
  }, []);
  const onTurnstileReset = useCallback(() => {
    setToken('');
  }, []);

  const onSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setArmed(true);
    const value = email.trim();
    const honeypot = new FormData(event.currentTarget).get('extraNote');
    const extraNote = typeof honeypot === 'string' ? honeypot : '';
    const nextErrors = {
      email:
        EMAIL.test(value) && value.length <= FIELD_LIMITS.emailMax
          ? undefined
          : 'Enter a valid email address.',
      turnstileToken: token ? undefined : 'Complete the security check.',
    };
    setErrors(nextErrors);
    if (nextErrors.email ?? nextErrors.turnstileToken) {
      setStatus({ type: 'idle' });
      if (nextErrors.email) emailRef.current?.focus();
      return;
    }

    if (idempotencyRef.current?.email !== value) {
      idempotencyRef.current = { key: newIdempotencyKey(), email: value };
    }
    setStatus({ type: 'submitting' });
    let result: NewsletterSubscribeResult;
    try {
      result = await action(
        { email: value, turnstileToken: token, extraNote },
        idempotencyRef.current.key,
      );
    } catch {
      result = { ok: false, message: ACTION_MESSAGES.network };
    }
    // Turnstile tokens are single-use.
    turnstileRef.current?.reset();
    setToken('');

    if (result.ok) {
      idempotencyRef.current = null;
      setEmail('');
      setStatus({ type: 'success' });
      // Visual only: the form's own status region announces the same message.
      toast({
        title: 'Almost subscribed',
        description: NEWSLETTER_MESSAGES.subscribed,
        tone: 'success',
        announce: false,
      });
      return;
    }
    setErrors({
      email: result.fieldErrors?.email,
      turnstileToken: result.fieldErrors?.turnstileToken,
    });
    setStatus({ type: 'error', message: result.message });
    toast({ title: 'Not subscribed', description: result.message, tone: 'error', announce: false });
  };

  const submitting = status.type === 'submitting';

  return (
    <form
      noValidate
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3"
      onFocus={arm}
      onPointerDown={arm}
      onSubmit={(event) => void onSubmit(event)}
    >
      <h2 id={`${id}-title`} className="font-display text-lg font-semibold text-fg">
        Newsletter
      </h2>
      <p className="text-sm text-muted">One email a month about web design, 3D and performance.</p>
      <div className="flex flex-col gap-2">
        <label htmlFor={emailId} className="text-sm font-medium text-fg">
          Email
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            ref={emailRef}
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={FIELD_LIMITS.emailMax}
            value={email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={[errors.email ? fieldErrorId(emailId) : '', `${id}-consent`]
              .filter(Boolean)
              .join(' ')}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
          <Button type="submit" disabled={submitting} aria-disabled={submitting}>
            {submitting ? 'Subscribing…' : 'Subscribe'}
          </Button>
        </div>
        {errors.email ? (
          <p id={fieldErrorId(emailId)} className="text-sm text-danger">
            {errors.email}
          </p>
        ) : null}
      </div>
      <p id={`${id}-consent`} className="text-xs text-muted">
        By subscribing you agree to receive our newsletter. We send a confirmation email first, and
        every issue has an unsubscribe link. See the{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">
          privacy policy
        </Link>
        .
      </p>
      <HoneypotField />
      {armed ? (
        <Turnstile
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          action="newsletter"
          onToken={onToken}
          onReset={onTurnstileReset}
          className="min-h-[65px]"
        />
      ) : null}
      {errors.turnstileToken ? (
        <p role="alert" className="text-sm text-danger">
          {errors.turnstileToken}
        </p>
      ) : null}
      <div role="status" aria-live="polite" className="text-sm empty:hidden">
        {status.type === 'success' ? (
          <p className="text-success">{NEWSLETTER_MESSAGES.subscribed}</p>
        ) : null}
        {status.type === 'error' ? <p className="text-danger">{status.message}</p> : null}
      </div>
    </form>
  );
}
