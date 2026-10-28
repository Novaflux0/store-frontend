import type { ComponentPropsWithRef } from 'react';

/**
 * Honeypot (bot defense, ADR 0018): an `extraNote` field people never see, so only bots
 * that fill every input fill it; the API then rejects the form and scores the sender.
 * Off-screen rather than `display: none` (some bots skip hidden inputs), hidden from
 * assistive technology and out of the tab order. A non-semantic name plus the opt-out
 * attributes of the common password managers keep autofill from ever filling it.
 */
export function HoneypotField(props: Omit<ComponentPropsWithRef<'input'>, 'type'>) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden"
    >
      <label>
        Leave this field empty
        <input
          type="text"
          name="extraNote"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          defaultValue=""
          {...props}
        />
      </label>
    </div>
  );
}
