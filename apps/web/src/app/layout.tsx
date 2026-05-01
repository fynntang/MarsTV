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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF6B35" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MarsTV" />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: inline SW registration
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </head>
      <body className="marstv-space-bg flex min-h-full flex-col text-foreground">
        {cloudStorage && (
          <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered constant
            dangerouslySetInnerHTML={{ __html: 'window.__MARSTV_CLOUD_STORAGE__=true;' }}
          />
        )}
        <Suspense fallback={null}>
          <ClientNavProgress />
        </Suspense>
        <header className="glass-header sticky top-0 z-30">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-8 lg:px-12">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/80 text-xs font-bold text-white shadow-[0_0_12px_rgba(255,107,53,0.3)]"
              >
                M
              </span>
              <span className="text-foreground/90">MarsTV</span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm sm:flex">
              {[
                ['/', '首页'],
                ['/search', '搜索'],
                ['/douban', '豆瓣'],
                ['/subscriptions', '追剧'],
                ['/history', '历史'],
                ['/favorites', '收藏'],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-1.5 text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>
            {/* Mobile nav — icon-only compact row */}
            <nav className="flex items-center gap-0.5 sm:hidden">
              {[
                ['/', '家'],
                ['/search', '搜'],
                ['/douban', '瓣'],
                ['/subscriptions', '追'],
                ['/history', '史'],
                ['/favorites', '藏'],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="relative z-[1] flex flex-1 flex-col">{children}</main>
        <footer className="glass-footer relative z-[1] py-5">
          <div className="mx-auto w-full max-w-7xl px-4 text-center text-[11px] text-dim-foreground md:px-8 lg:px-12">
            MarsTV · 仅限个人学习研究 · 不提供、不存储、不分发任何视频内容
          </div>
        </footer>
        <DisclaimerDialog />
      </body>
    </html>
  );
}
