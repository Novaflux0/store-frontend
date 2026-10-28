'use client';

import { useEffect, useRef } from 'react';

import { bulbInput } from '@/components/three/journey/bulb-input';

/**
 * The 3D bulb's place in the hero artwork: an anchor box over the bulb in the image
 * (the scene maps it into 3D, so the bulb sits above the palm at any screen size) and
 * a drag area that turns the bulb. The canvas is behind the page, so the drags are
 * forwarded through `bulbInput`. `touch-action: pan-y` keeps vertical swipes scrolling
 * the page on phones; sideways swipes turn the bulb. Decorative, so hidden from
 * assistive technology; the grab cursor only shows while the 3D scene runs.
 */
export function BulbStage() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    bulbInput.attach(anchorRef.current);
    return () => {
      bulbInput.attach(null);
    };
  }, []);

  return (
    <>
      <div ref={anchorRef} className="absolute top-[18.7%] left-[47.3%] h-[43.2%] w-px" />
      <div
        className="bulb-drag pointer-events-auto absolute top-[8%] left-[28%] h-[54%] w-[38%] touch-pan-y select-none"
        onPointerDown={(event) => {
          // No text selection while dragging across the headline.
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          last.current = { x: event.clientX, y: event.clientY };
          bulbInput.grab();
        }}
        onPointerMove={(event) => {
          bulbInput.move(event.clientX - last.current.x, event.clientY - last.current.y);
          last.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={() => {
          bulbInput.release();
        }}
        onPointerCancel={() => {
          bulbInput.release();
        }}
        onLostPointerCapture={() => {
          bulbInput.release();
        }}
      />
    </>
  );
}
