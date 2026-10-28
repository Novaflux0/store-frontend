'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@agency/ui';
import { OPAQUE_TOKEN_LENGTH } from '@agency/validation/constants';

import type { NewsletterTokenResult } from '@/app/(marketing)/newsletter/newsletter-result';
import { ACTION_MESSAGES } from '@/lib/forms/action-result';

export type NewsletterTokenAction = (token: string) => Promise<NewsletterTokenResult>;

export type NewsletterTokenMode = 'confirm' | 'unsubscribe';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/**
 * Reads `#token=…` from a URL fragment. Only the format is checked here (length and
 * alphabet, without Zod); the API decides whether the token is valid.
 */
export function readTokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token');
  if (token?.length !== OPAQUE_TOKEN_LENGTH || !BASE64URL.test(token)) return null;
  return token;
}

const COPY = {
  confirm: {
    button: 'Confirm subscription',
    busy: 'Confirming…',
    prompt: 'Click the button below to confirm that you want to receive our newsletter.',
    success: 'You are subscribed. Thanks for confirming!',
    successDetail: 'The next issue will arrive in your inbox.',
    invalidHelp:
      'Confirmation links work once and expire after 48 hours. Sign up again with the form at the bottom of this page and we will send you a new link.',
  },
  unsubscribe: {
    button: 'Unsubscribe',
    busy: 'Unsubscribing…',
    prompt: 'Click the button below to stop receiving our newsletter.',
    success: 'You have been unsubscribed.',
    successDetail: 'You will not receive any more newsletters from us.',
    invalidHelp:
      'Use the unsubscribe link in the most recent newsletter you received, or write to us and we will remove you.',
  },
} as const;

type State =
  | { readonly type: 'reading' }
  | { readonly type: 'ready'; readonly token: string; readonly error?: string }
  | { readonly type: 'submitting'; readonly token: string }
  | { readonly type: 'success' }
  | { readonly type: 'invalid' };

export interface NewsletterTokenPanelProps {
  readonly mode: NewsletterTokenMode;
  readonly action: NewsletterTokenAction;
  readonly contactEmail: string;
}

/**
 * Body of `/newsletter/confirm` and `/newsletter/unsubscribe` (plan I2-7). The token
 * travels in the URL fragment, which browsers never send to a server, and it is
 * posted only when the visitor clicks the button, so email security scanners that
 * open links cannot confirm or unsubscribe anyone. The fragment is removed from the
 * address bar (and history) as soon as it has been read.
 */
export function NewsletterTokenPanel({ mode, action, contactEmail }: NewsletterTokenPanelProps) {
  const copy = COPY[mode];
  const [state, setState] = useState<State>({ type: 'reading' });
  const readRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Strict Mode runs effects twice in development; the hash is read only once.
    if (readRef.current) return;
    readRef.current = true;
    const token = readTokenFromHash(window.location.hash);
    if (window.location.hash) {
      const { pathname, search } = window.location;
      window.history.replaceState(window.history.state, '', `${pathname}${search}`);
    }
    // Reading the URL fragment is only possible after hydration.
    setState(token ? { type: 'ready', token } : { type: 'invalid' });
  }, []);

  const onClick = async () => {
    if (state.type !== 'ready') return;
    const { token } = state;
    setState({ type: 'submitting', token });
    let result: NewsletterTokenResult;
    try {
      result = await action(token);
    } catch {
      result = { ok: false, reason: 'retry', message: ACTION_MESSAGES.network };
    }
    if (result.ok) setState({ type: 'success' });
    else if (result.reason === 'invalid') setState({ type: 'invalid' });
    else setState({ type: 'ready', token, error: result.message });
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  return (
    <div
      ref={resultRef}
      tabIndex={-1}
      className="flex max-w-xl flex-col gap-6 rounded-2xl border border-line bg-surface p-8 outline-none"
    >
      <div role="status" aria-live="polite" className="flex flex-col gap-3">
        {state.type === 'reading' ? <p className="text-muted">Checking your link…</p> : null}
        {state.type === 'ready' || state.type === 'submitting' ? (
          <p className="text-muted">{copy.prompt}</p>
        ) : null}
        {state.type === 'ready' && state.error ? (
          <p className="text-danger">{state.error}</p>
        ) : null}
        {state.type === 'success' ? (
          <>
            <h2 className="text-2xl font-semibold text-fg">{copy.success}</h2>
            <p className="text-muted">{copy.successDetail}</p>
          </>
        ) : null}
        {state.type === 'invalid' ? (
          <>
            <h2 className="text-2xl font-semibold text-fg">This link is invalid or has expired</h2>
            <p className="text-muted">
              {copy.invalidHelp} Questions? Email{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="text-neon-cyan underline underline-offset-4"
              >
                {contactEmail}
              </a>
              .
            </p>
          </>
        ) : null}
      </div>
      {state.type === 'ready' || state.type === 'submitting' ? (
        <div>
          <Button
            size="lg"
            disabled={state.type === 'submitting'}
            aria-disabled={state.type === 'submitting'}
            onClick={() => void onClick()}
          >
            {state.type === 'submitting' ? copy.busy : copy.button}
          </Button>
        </div>
      ) : null}
      {state.type === 'success' || state.type === 'invalid' ? (
        <p>
          <Link href="/" className="font-medium text-neon-cyan hover:underline">
            Back to the home page
          </Link>
        </p>
      ) : null}
    </div>
  );
}
