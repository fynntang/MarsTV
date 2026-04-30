import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace 内源码包(.ts)需要 Next 编译
  transpilePackages: ['@marstv/core', '@marstv/ui-web', '@marstv/config'],

  // 'export' for Tauri desktop (static files), 'standalone' for Docker / Vercel / self-hosted
  output: process.env.TAURI_BUILD === '1' ? 'export' : 'standalone',

  // Next.js output: 'export' requires unoptimized images
  images: process.env.TAURI_BUILD === '1' ? { unoptimized: true } : undefined,
};

// Only activate OpenNext CF dev proxy when explicitly requested.
// Unset under Vercel / Docker / plain `next dev` — those run Node.js natively.
if (process.env.OPEN_NEXT_DEV === '1') {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
