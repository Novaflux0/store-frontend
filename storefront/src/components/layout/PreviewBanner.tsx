import { Container } from '@agency/ui';

/**
 * Shown while Draft Mode is on (an editor opened a preview link from the dashboard).
 * Leaving uses a POST form, so a link prefetch can never end the preview by accident.
 */
export function PreviewBanner() {
  return (
    <aside aria-label="Preview" className="border-b border-neon-violet/50 bg-surface">
      <Container className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-3 text-sm">
        <p className="text-neon-violet-text">
          Preview: you are seeing unpublished changes. Visitors do not see them yet.
        </p>
        <form method="post" action="/api/preview/exit">
          <button
            type="submit"
            className="font-medium text-neon-cyan underline underline-offset-4 hover:decoration-2"
          >
            Exit preview
          </button>
        </form>
      </Container>
    </aside>
  );
}
