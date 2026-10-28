'use client';

import { useEffect } from 'react';

import { ErrorPanel, errorDigest } from '@/components/sections/ErrorPanel';

import '@/styles/globals.css';

/** Replaces the root layout when it fails, so it renders its own document. */
export default function GlobalError({
  error,
  retry,
}: {
  readonly error: unknown;
  readonly retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <title>Something went wrong</title>
        <main id="main">
          <ErrorPanel onRetry={retry} digest={errorDigest(error)} />
        </main>
      </body>
    </html>
  );
}
