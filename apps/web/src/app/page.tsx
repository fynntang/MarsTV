import { NextContinueWatching } from '@/components/next-continue-watching';
import { NextDoubanRow } from '@/components/next-douban-row';
import { NextSearchBox } from '@/components/next-search-box';
import { NextSubscriptionRow } from '@/components/next-subscription-row';
import { requirePagePassword } from '@/lib/site-password-guard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const QUICK_LINKS = ['肖申克的救赎', '流浪地球', '间谍过家家', '琅琊榜'];

export default async function Home() {
  await requirePagePassword('/');

  return (
    <div className="page-enter flex flex-1 flex-col">
      {/* ── Hero ── */}
      <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-16 pb-8 text-center sm:pt-24 sm:pb-12 md:px-8 lg:pt-32 lg:pb-16 lg:px-12">
        {/* Badge */}
        <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] text-muted-foreground sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(255,107,53,0.5)]" />
          <span className="relative top-px">M1 · 聚合搜索已就绪</span>
        </span>

        {/* Title */}
        <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          来自火星的
          <span className="ml-2 bg-gradient-to-br from-[var(--primary)] via-[var(--primary-hover)] to-[var(--accent)] bg-clip-text text-transparent">
            影视聚合
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base lg:text-lg">
          多源并发测速 · 智能切换线路 · 边缘缓存加速
        </p>

        {/* Search — glass panel */}
        <div className="glass-elevated mt-10 w-full max-w-2xl rounded-2xl p-2 sm:p-3 lg:max-w-3xl">
          <NextSearchBox autoFocus size="lg" />
        </div>

        {/* Quick links — glass chips */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="text-xs text-dim-foreground">试试:</span>
          {QUICK_LINKS.map((k) => (
            <Link
              key={k}
              href={`/search?q=${encodeURIComponent(k)}`}
              className="glass-card rounded-full px-3.5 py-1.5 text-xs text-foreground/80 transition-all hover:text-primary hover:border-primary/30 sm:text-sm"
            >
              {k}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/search"
            className="glass-btn-primary rounded-lg px-5 py-2.5 text-sm font-medium"
          >
            🔍 浏览全部源
          </Link>
          <a
            href="https://github.com/FarVoyageLab/MarsTV"
            target="_blank"
            rel="noreferrer"
            className="glass-card rounded-lg px-5 py-2.5 text-xs text-muted-foreground transition-all hover:text-foreground sm:text-sm"
          >
            GitHub →
          </a>
        </div>
      </section>

      {/* ── Content rows ── */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 md:px-8 lg:px-12">
        <NextContinueWatching />
        <NextSubscriptionRow />
        <NextDoubanRow type="tv" tag="热门" title="热门剧集" />
        <NextDoubanRow type="movie" tag="热门" title="热门电影" />
        <NextDoubanRow type="tv" tag="国产剧" title="国产剧" />
        <NextDoubanRow type="movie" tag="豆瓣高分" title="豆瓣高分电影" />
      </section>
    </div>
  );
}
