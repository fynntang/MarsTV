import { requirePagePassword } from '@/lib/site-password-guard';
import { cn } from '@/lib/utils';
import { type DoubanItem, type DoubanMediaType, searchDouban } from '@marstv/core';
import { AvailabilityBadge } from '@marstv/ui-web';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

const MOVIE_TAGS = [
  '热门',
  '最新',
  '经典',
  '豆瓣高分',
  '冷门佳片',
  '华语',
  '欧美',
  '韩国',
  '日本',
  '动作',
  '喜剧',
  '爱情',
  '科幻',
  '悬疑',
  '恐怖',
  '动画',
];

const TV_TAGS = [
  '热门',
  '美剧',
  '英剧',
  '韩剧',
  '日剧',
  '国产剧',
  '港剧',
  '日本动画',
  '综艺',
  '纪录片',
];

function asString(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : '';
}

function parseType(v: string): DoubanMediaType {
  return v === 'movie' ? 'movie' : 'tv';
}

function parsePage(v: string): number {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function generateMetadata(props: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await props.searchParams;
  await requirePagePassword('/douban', sp);
  const type = parseType(asString(sp.type));
  const tag = asString(sp.tag) || (type === 'movie' ? '热门' : '热门');
  const label = type === 'movie' ? '电影' : '剧集';
  return { title: `豆瓣 · ${label} · ${tag}` };
}

export default async function DoubanPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  await requirePagePassword('/douban', sp);
  const type = parseType(asString(sp.type));
  const tagList = type === 'movie' ? MOVIE_TAGS : TV_TAGS;
  const tagRaw = asString(sp.tag).trim();
  const tag = tagRaw && tagList.includes(tagRaw) ? tagRaw : tagList[0];
  const page = parsePage(asString(sp.page));

  return (
    <div className="page-enter mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">豆瓣片单</h1>
        <span className="text-xs text-dim-foreground">点击任意片名将搜索所有已配置的源</span>
      </div>

      {/* Type toggle */}
      <div className="mb-4 inline-flex glass rounded-full p-1">
        {(['tv', 'movie'] as const).map((t) => (
          <Link
            key={t}
            href={`/douban?type=${t}`}
            className={cn(
              'rounded-full px-4 py-1 text-sm transition-colors',
              type === t
                ? 'bg-primary text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'tv' ? '剧集' : '电影'}
          </Link>
        ))}
      </div>

      {/* Tag pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tagList.map((t) => {
          const active = t === tag;
          return (
            <Link
              key={t}
              href={`/douban?type=${type}&tag=${encodeURIComponent(t)}`}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors',
                active
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'glass text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </Link>
          );
        })}
      </div>

      <Suspense key={`${type}:${tag}:${page}`} fallback={<GridSkeleton />}>
        <Grid type={type} tag={tag} page={page} />
      </Suspense>
    </div>
  );
}

async function Grid({ type, tag, page }: { type: DoubanMediaType; tag: string; page: number }) {
  let items: DoubanItem[] = [];
  let failed = false;
  try {
    const r = await searchDouban({
      type,
      tag,
      pageSize: PAGE_SIZE,
      pageStart: page * PAGE_SIZE,
      timeoutMs: 8000,
    });
    items = r.items;
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-8 text-center text-sm text-danger">
        豆瓣暂不可用,请稍后再试
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border glass-card rounded-xl px-4 py-10 text-center text-sm text-muted-foreground">
        此标签下暂无更多内容
      </div>
    );
  }

  // Douban doesn't give a total count; infer "has next" from whether this
  // page is full. Not perfect (last page of exactly PAGE_SIZE over-guesses)
  // but good enough — next page just shows empty state.
  const hasPrev = page > 0;
  const hasNext = items.length >= PAGE_SIZE;

  return (
    <>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {items.map((item) => (
          <DoubanCard key={item.id} item={item} />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        {hasPrev ? (
          <Link
            href={`/douban?type=${type}&tag=${encodeURIComponent(tag)}&page=${page - 1}`}
            className="glass-card inline-flex items-center rounded-full px-4 py-1.5 text-sm text-foreground transition-all hover:border-primary/30 hover:text-primary"
          >
            上一页
          </Link>
        ) : (
          <span className="glass inline-flex items-center rounded-full px-4 py-1.5 text-sm text-dim-foreground">
            上一页
          </span>
        )}
        <span className="text-sm text-muted-foreground">第 {page + 1} 页</span>
        {hasNext ? (
          <Link
            href={`/douban?type=${type}&tag=${encodeURIComponent(tag)}&page=${page + 1}`}
            className="glass-card inline-flex items-center rounded-full px-4 py-1.5 text-sm text-foreground transition-all hover:border-primary/30 hover:text-primary"
          >
            下一页
          </Link>
        ) : (
          <span className="glass inline-flex items-center rounded-full px-4 py-1.5 text-sm text-dim-foreground">
            下一页
          </span>
        )}
      </div>
    </>
  );
}

function DoubanCard({ item }: { item: DoubanItem }) {
  const proxiedCover = `/api/image/douban?u=${encodeURIComponent(item.cover)}`;
  const searchParams = new URLSearchParams({ q: item.title });
  if (item.cover) searchParams.set('dbCover', item.cover);
  if (item.rate) searchParams.set('dbRate', item.rate);
  if (item.url) searchParams.set('db', item.url);
  return (
    <Link
      href={`/search?${searchParams.toString()}`}
      className="group glass-card relative flex flex-col overflow-hidden rounded-xl"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
        <img
          src={proxiedCover}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        {item.rate ? (
          <span className="absolute bottom-1 right-1 rounded bg-background/80 px-1.5 py-0.5 text-[11px] font-medium text-primary">
            {item.rate}
          </span>
        ) : null}
        {item.isNew ? (
          <span className="absolute left-1 top-1 rounded bg-primary/80 px-1.5 py-0.5 text-[10px] font-medium text-background">
            新
          </span>
        ) : null}
        <AvailabilityBadge title={item.title} />
      </div>
      <div className="truncate px-2 py-1.5 text-xs text-foreground group-hover:text-primary">
        {item.title}
      </div>
    </Link>
  );
}

const SKELETON_KEYS = Array.from({ length: PAGE_SIZE }, (_, i) => `sk-${i}`);

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {SKELETON_KEYS.map((k) => (
        <div key={k} className="glass-card animate-pulse overflow-hidden rounded-xl">
          <div className="aspect-[2/3] w-full bg-white/5" />
          <div className="h-7 px-2 py-1.5">
            <div className="h-3 w-3/4 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
