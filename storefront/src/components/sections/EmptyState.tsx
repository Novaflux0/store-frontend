import type { ReactNode } from 'react';

export interface EmptyStateProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-10 text-center">
      <h2 className="text-xl font-semibold text-fg">{title}</h2>
      <div className="mx-auto mt-3 max-w-md text-muted">{children}</div>
    </div>
  );
}
