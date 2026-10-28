'use client';

import Link from 'next/link';

import { Button, Container, buttonClassName } from '@agency/ui';

export interface ErrorPanelProps {
  /** Re-renders the failed segment (`unstable_retry` / `reset` from the error boundary). */
  readonly onRetry: () => void;
  /** Server error digest; safe to show (no stack or message is exposed, doc §13.4). */
  readonly digest?: string | undefined;
}

/** Shared body of the route-group `error.tsx` boundaries. */
export function ErrorPanel({ onRetry, digest }: ErrorPanelProps) {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center gap-6 section-y">
      <p className="font-display text-sm tracking-[0.2em] text-neon-cyan uppercase">Error</p>
      <h1 className="text-4xl font-semibold tracking-tight text-fg md:text-5xl">
        Something went wrong
      </h1>
      <p className="max-w-xl text-lg text-muted">
        An unexpected error stopped this page from loading. Please try again.
        {digest ? ` Reference: ${digest}.` : null}
      </p>
      <div className="flex flex-wrap gap-4">
        <Button onClick={onRetry}>Try again</Button>
        <Link href="/" className={buttonClassName({ variant: 'ghost' })}>
          Go to the home page
        </Link>
      </div>
    </Container>
  );
}

/** Reads the server error digest from an unknown thrown value. */
export function errorDigest(error: unknown): string | undefined {
  if (error instanceof Error && 'digest' in error && typeof error.digest === 'string') {
    return error.digest;
  }
  return undefined;
}
