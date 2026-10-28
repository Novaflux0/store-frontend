import { ImageResponse } from 'next/og';

import { getSettings } from '@/content/registry';

export const alt = 'The site name and tagline on a dark, glowing background';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default Open Graph image with the brand from the site settings (static, revalidated with them). */
export default async function OpenGraphImage() {
  const { site } = await getSettings();
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 96,
        background:
          'radial-gradient(circle at 75% 40%, rgba(139,92,246,0.55), transparent 55%), radial-gradient(circle at 85% 70%, rgba(34,211,238,0.45), transparent 50%), #05060a',
        color: '#e8eaf0',
      }}
    >
      <div style={{ fontSize: 40, color: '#22d3ee', letterSpacing: 8 }}>{site.name}</div>
      <div style={{ marginTop: 24, fontSize: 72, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
        {site.tagline}
      </div>
    </div>,
    size,
  );
}
