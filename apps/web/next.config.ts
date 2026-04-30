import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@marstv/core', '@marstv/ui-web', '@marstv/config'],
  output: 'standalone',
};

// Only activate OpenNext CF dev proxy when explicitly requested.
// Unset under Vercel / Docker / plain `next dev` — those run Node.js natively.
if (process.env.OPEN_NEXT_DEV === '1') {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
