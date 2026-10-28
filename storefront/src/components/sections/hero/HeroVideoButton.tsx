'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { youtubeEmbedUrl } from '@/components/sections/home/YouTubeFacade';

export interface HeroVideoButtonProps {
  readonly videoId: string;
  /** Accessible name of the button, the dialog and the player frame. */
  readonly label: string;
  readonly className: string;
  /** The badge (server-rendered artwork). */
  readonly children: ReactNode;
}

/**
 * Opens the hero video in a modal dialog. Like `YouTubeFacade`, nothing loads from
 * YouTube until the visitor asks for it; closing the dialog (Escape or the close
 * button) removes the player, which stops the video.
 */
export function HeroVideoButton({ videoId, label, className, children }: HeroVideoButtonProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        className={className}
        onClick={() => {
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open ? (
        <dialog
          ref={dialogRef}
          aria-label={label}
          data-lenis-prevent=""
          className="m-auto w-[min(92vw,80rem)] overflow-visible bg-transparent p-0 backdrop:bg-black/85"
          onClose={() => {
            setOpen(false);
          }}
        >
          <form method="dialog" className="flex justify-end pb-3">
            <button
              type="submit"
              className="rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Close
            </button>
          </form>
          <iframe
            src={youtubeEmbedUrl(videoId)}
            title={label}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-video w-full rounded-2xl bg-black"
          />
        </dialog>
      ) : null}
    </>
  );
}
