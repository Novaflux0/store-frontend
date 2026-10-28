'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
  /** Rendered instead of the canvas after a crash; the static fallback sits underneath. */
  readonly fallback?: ReactNode;
}

interface State {
  readonly failed: boolean;
}

/**
 * Contains WebGL / shader / driver failures so a 3D crash never breaks the page
 * (doc §13.4). React still has no hook equivalent of error boundaries.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('[3D] hero scene disabled after an error', error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
