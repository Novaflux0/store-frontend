'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { YOUTUBE_EMBED_ORIGIN } from '@/lib/security/csp';

export function youtubeEmbedUrl(videoId: string): string {
  const url = new URL(`/embed/${encodeURIComponent(videoId)}`, YOUTUBE_EMBED_ORIGIN);
  url.searchParams.set('autoplay', '1');
  url.searchParams.set('rel', '0');
  return url.toString();
}

export interface YouTubeFacadeProps {
  readonly videoId: string;
  /** Accessible name of the play button and the player frame. */
  readonly title: string;
  /** The poster (a server-rendered image). */
  readonly children: ReactNode;
}

/**
 * Click-to-load YouTube player: only a poster and a button until the visitor asks
 * for the video, so no third-party request (or cookie) happens on page load and the
 * page keeps its performance score. Focus moves into the player when it opens.
 */
export function YouTubeFacade({ videoId, title, children }: YouTubeFacadeProps) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  if (playing) {
    return (
      <div data-video-embed="" className="aspect-video w-full overflow-hidden bg-black">
        <iframe
          ref={frameRef}
          src={youtubeEmbedUrl(videoId)}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full"
          data-lenis-prevent=""
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Play video: ${title}`}
      className="group relative block aspect-video w-full overflow-hidden bg-surface-raised"
      onClick={() => {
        setPlaying(true);
      }}
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cta text-white shadow-[0_0_40px_color-mix(in_oklab,var(--color-cta)_70%,transparent)] transition-transform duration-300 group-hover:scale-110"
      >
        <svg viewBox="0 0 24 24" className="ml-1 size-7" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
    </button>
  );
}
