import { ContinueWatchingRow } from '@/components/continue-watching-row';
import { DoubanRow } from '@/components/douban-row';
import { SearchBox } from '@/components/search-box';
import { SubscriptionRow } from '@/components/subscription-row';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="marstv-hero-bg flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-16 pb-6 text-center md:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          M1 · 聚合搜索已就绪
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          来自火星的
          <span className="ml-2 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] bg-clip-text text-transparent">
            影视聚合浏览器
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          多源并发测速、智能切换线路、边缘缓存加速。更快、更好看、全端可用。
        </p>

        <div className="mt-10 w-full max-w-2xl">
          <SearchBox autoFocus size="lg" />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <span>试试:</span>
          {['肖申克的救赎', '流浪地球', '间谍过家家', '琅琊榜'].map((k) => (
            <Link
              key={k}
              href={`/search?q=${encodeURIComponent(k)}`}
              className="rounded-full border border-border/70 px-3 py-1 text-foreground/90 transition-colors hover:border-primary hover:text-primary"
            >
              {k}
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <a href="https://github.com/marstv" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/search">浏览全部源</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-8">
        <ContinueWatchingRow />
        <SubscriptionRow />
        <DoubanRow type="tv" tag="热门" title="热门剧集" />
        <DoubanRow type="movie" tag="热门" title="热门电影" />
        <DoubanRow type="tv" tag="国产剧" title="国产剧" />
        <DoubanRow type="movie" tag="豆瓣高分" title="豆瓣高分电影" />
      </section>
    </div>
  );
}
