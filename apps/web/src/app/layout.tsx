import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { Suspense } from 'react';
import './globals.css';
import { isCloudStorageEnabled } from '@/lib/storage';
import { DisclaimerDialog } from '@marstv/ui-web';
import { ClientNavProgress } from './client-nav-progress';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'MarsTV — 更快、更好看、全端可用',
    template: '%s · MarsTV',
  },
  description: 'MarsTV 是一个跨平台开源影视聚合浏览器,聚合多源测速、智能切换与追剧订阅。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cloudStorage = isCloudStorageEnabled();
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {cloudStorage && (
          // Flag read by `getClientStorage()` to route reads/writes through
          // /api/storage/* instead of browser localStorage.
          <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered constant
            dangerouslySetInnerHTML={{ __html: 'window.__MARSTV_CLOUD_STORAGE__=true;' }}
          />
        )}
        <Suspense fallback={null}>
          <ClientNavProgress />
        </Suspense>
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-8">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span
                aria-hidden="true"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-background"
              >
                M
              </span>
              <span>MarsTV</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                首页
              </Link>
              <Link href="/search" className="hover:text-foreground">
                搜索
              </Link>
              <Link href="/douban" className="hover:text-foreground">
                豆瓣
              </Link>
              <Link href="/subscriptions" className="hover:text-foreground">
                追剧
              </Link>
              <Link href="/history" className="hover:text-foreground">
                历史
              </Link>
              <Link href="/favorites" className="hover:text-foreground">
                收藏
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-border/60 py-6">
          <div className="mx-auto w-full max-w-6xl px-4 text-center text-xs text-dim-foreground md:px-8">
            MarsTV · 仅限个人学习研究 · 不提供、不存储、不分发任何视频内容
          </div>
        </footer>
        <DisclaimerDialog />
      </body>
    </html>
  );
}
