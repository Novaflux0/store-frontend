'use client';

import { useEffect } from 'react';

import { ErrorPanel, errorDigest } from '@/components/sections/ErrorPanel';

export default function MarketingError({
  error,
  retry,
}: {
  readonly error: unknown;
  readonly retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorPanel onRetry={retry} digest={errorDigest(error)} />;
}
