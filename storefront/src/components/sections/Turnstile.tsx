'use client';

import Script from 'next/script';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';

import { TURNSTILE_ORIGIN } from '@/lib/security/csp';

/** Subset of the Cloudflare Turnstile client API used here (explicit rendering). */
interface TurnstileRenderOptions {
  readonly sitekey: string;
  readonly action?: string;
  readonly theme?: 'auto' | 'light' | 'dark';
  readonly size?: 'normal' | 'flexible' | 'compact';
  readonly callback?: (token: string) => void;
  readonly 'expired-callback'?: () => void;
  readonly 'error-callback'?: () => void;
  readonly 'timeout-callback'?: () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string | undefined;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_SCRIPT_SRC = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`;

export interface TurnstileHandle {
  /** Turnstile tokens are single-use: reset after every submission attempt. */
  reset(): void;
}

export interface TurnstileProps {
  readonly siteKey: string;
  /** Analytics label shown in the Cloudflare dashboard, e.g. `contact`. */
  readonly action?: string;
  readonly onToken: (token: string) => void;
  /** Called when the token expires or the challenge fails; clear the stored token. */
  readonly onReset: () => void;
  readonly ref?: Ref<TurnstileHandle>;
  readonly className?: string;
}

/** Minimal Turnstile widget: loads the script once, renders explicitly, cleans up on unmount. */
export function Turnstile({ siteKey, action, onToken, onReset, ref, className }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const callbacksRef = useRef({ onToken, onReset });
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onToken, onReset };
  }, [onToken, onReset]);

  useEffect(() => {
    const api = window.turnstile;
    const container = containerRef.current;
    if (!scriptReady || !api || !container) return;
    const widgetId = api.render(container, {
      sitekey: siteKey,
      ...(action ? { action } : {}),
      theme: 'dark',
      size: 'flexible',
      callback: (token) => {
        callbacksRef.current.onToken(token);
      },
      'expired-callback': () => {
        callbacksRef.current.onReset();
      },
      'error-callback': () => {
        callbacksRef.current.onReset();
      },
      'timeout-callback': () => {
        callbacksRef.current.onReset();
      },
    });
    widgetIdRef.current = widgetId;
    return () => {
      if (widgetId) api.remove(widgetId);
      widgetIdRef.current = undefined;
    };
  }, [scriptReady, siteKey, action]);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        const widgetId = widgetIdRef.current;
        if (widgetId) window.turnstile?.reset(widgetId);
      },
    }),
    [],
  );

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => {
          setScriptReady(true);
        }}
      />
      <div ref={containerRef} className={className} />
    </>
  );
}
