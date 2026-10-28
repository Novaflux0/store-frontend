import type { NextConfig } from 'next';

import { clientEnv } from './src/lib/env/client';
import { buildSecurityHeaders } from './src/lib/security/headers';

/** CMS images are served from the media bucket (ADR 0017), not from `public/`. */
const mediaOrigin = new URL(clientEnv.NEXT_PUBLIC_MEDIA_ORIGIN);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: mediaOrigin.protocol === 'http:' ? 'http' : 'https',
        hostname: mediaOrigin.hostname,
        ...(mediaOrigin.port ? { port: mediaOrigin.port } : {}),
        pathname: '/**',
      },
    ],
  },
  // The CSP is set per path by src/proxy.ts (ADR 0004); every other security header
  // is static and set here.
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: buildSecurityHeaders() }]);
  },
};

export default nextConfig;
