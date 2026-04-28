import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace 内源码包(.ts)需要 Next 编译
  transpilePackages: ['@marstv/core', '@marstv/ui-web', '@marstv/config'],
};

export default nextConfig;
