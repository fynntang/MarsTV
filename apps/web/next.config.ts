import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace 内源码包(.ts)需要 Next 编译
  transpilePackages: ['@marstv/core', '@marstv/ui-web', '@marstv/config'],

  // Always 'standalone' — the app is fully dynamic (API routes, force-dynamic pages).
  // Tauri desktop uses the dev server in dev mode and a bundled server in production.
  output: 'standalone',
};

// Only activate OpenNext CF dev proxy when explicitly requested.
// Unset under Vercel / Docker / plain `next dev` — those run Node.js natively.
if (process.env.OPEN_NEXT_DEV === '1') {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
