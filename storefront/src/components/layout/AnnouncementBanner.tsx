import type { FeatureSettings } from '@agency/validation';
import type { Route } from 'next';
import Link from 'next/link';

import { Container } from '@agency/ui';

export interface AnnouncementBannerProps {
  readonly announcement: FeatureSettings['announcement'];
}

/** A short site-wide notice from the feature settings (e.g. holiday hours). */
export function AnnouncementBanner({ announcement }: AnnouncementBannerProps) {
  return (
    <aside aria-label="Announcement" className="border-b border-line bg-surface">
      <Container className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-3 text-center text-sm text-fg">
        <p>{announcement.message}</p>
        {announcement.link ? (
          <Link
            href={announcement.link.href as Route}
            className="font-medium text-neon-cyan underline underline-offset-4 hover:decoration-2"
          >
            {announcement.link.label}
          </Link>
        ) : null}
      </Container>
    </aside>
  );
}
