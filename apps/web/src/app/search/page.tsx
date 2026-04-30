import { NextSearchBox } from '@/components/next-search-box';
import { NextLinkComponent } from '@/lib/next-adapter';
import { cachedSearchSource } from '@/lib/search';
import { requirePagePassword } from '@/lib/site-password-guard';
import { loadSources } from '@/lib/sources';
import { cn } from '@/lib/utils';
import { type CmsSource, groupHitsByTitle } from '@marstv/core';
import { GroupedVideoCard, VideoCard } from '@marstv/ui-web';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await props.searchParams;
  await requirePagePassword('/search', sp);
  const q = typeof sp.q === 'string' ? sp.q : '';
  return { title: q ? `搜索 "${q}"` : '搜索' };
}

function asString(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : '';
}

export default async function SearchPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  await requirePagePassword('/search', sp);
  const keyword = asString(sp.q).trim();
  const sourceFilter = asString(sp.source).trim() || undefined;

  const dbCover = asString(sp.dbCover).trim();
  const dbRate = asString(sp.dbRate).trim();
  const dbUrl = asString(sp.db).trim();
  const doubanCtx =
    dbCover || dbRate || dbUrl
      ? { cover: dbCover || null, rate: dbRate || null, url: dbUrl || null }
      : null;

  const allSources = loadSources();
  const hasSources = allSources.length > 0;

  let filterError: string | null = null;
  let targets: CmsSource[] = [];

  if (keyword && hasSources) {
    targets = sourceFilter ? allSources.filter((s) => s.key === sourceFilter) : allSources;
    if (targets.length === 0) {
      filterError = `未找到源:${sourceFilter}`;
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
      <div className="mb-6">
        <NextSearchBox defaultValue={keyword} autoFocus={!keyword} />
      </div>

      {keyword && doubanCtx ? <DoubanContextCard keyword={keyword} ctx={doubanCtx} /> : null}

      {!hasSources ? (
        <EmptyState
          title="尚未配置 CMS 源"
          description="请在部署环境设置 CMS_SOURCES_JSON 环境变量(JSON 数组,每项含 key / name / api)。项目不内置任何源。"
        />
      ) : !keyword ? (
        <EmptyState
          title="输入关键词开始搜索"
          description={`当前已配置 ${allSources.length} 个源,支持聚合并发搜索。`}
        />
      ) : filterError ? (
        <EmptyState title="搜索出错" description={filterError} tone="danger" />
      ) : (
        <StreamingResults keyword={keyword} targets={targets} />
      )}
    </div>
  );
}

// Small context card shown above search results when the user arrived from a
// Douban card. Helps reassure "this is the title I picked". Poster is
// re-proxied through /api/image/douban to dodge hotlink protection.
function DoubanContextCard({
  keyword,
  ctx,
}: {
  keyword: string;
  ctx: { cover: string | null; rate: string | null; url: string | null };
}) {
  const proxiedCover = ctx.cover ? `/api/image/douban?u=${encodeURIComponent(ctx.cover)}` : null;
  return (
    <div className="mb-6 flex items-center gap-4 rounded-lg border border-border/60 bg-surface/40 p-3">
      {proxiedCover ? (
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-black">
          <img
            src={proxiedCover}
            alt={keyword}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] tracking-wide text-dim-foreground">来自豆瓣</span>
          {ctx.rate ? (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-medium text-primary">
              ★ {ctx.rate}
            </span>
          ) : null}
        </div>
        <h1 className="mt-1 truncate text-xl font-semibold text-foreground">{keyword}</h1>
        {ctx.url ? (
          <a
            href={ctx.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-block text-xs text-muted-foreground hover:text-primary"
          >
            豆瓣详情 →
          </a>
        ) : null}
      </div>
    </div>
  );
}

function StreamingResults({ keyword, targets }: { keyword: string; targets: CmsSource[] }) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          &quot;{keyword}&quot; · {targets.length} 个源
        </h1>
        <span className="text-xs text-muted-foreground">每源独立流式渲染</span>
      </div>

      {/* Pills row — each source streams its stat independently */}
      <div className="mb-6 flex flex-wrap gap-2">
        {targets.map((s) => (
          <Suspense key={s.key} fallback={<PillSkeleton label={s.name} />}>
            <SourcePill source={s} keyword={keyword} />
          </Suspense>
        ))}
      </div>

      {/* Primary view: aggregated across sources. Waits for all sources before
          rendering so titles that live in >1 source merge into a single card. */}
      <Suspense fallback={<AggregatedSkeleton />}>
        <AggregatedResults keyword={keyword} targets={targets} />
      </Suspense>

      {/* Secondary view: per-source breakdown, collapsed by default. Each
          section still streams in independently when expanded. */}
      <details className="mt-10 rounded-lg border border-border/50 bg-surface/30 open:bg-surface/40">
        <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
          按源分组查看完整结果
        </summary>
        <div className="flex flex-col gap-8 px-4 pb-6 pt-2">
          {targets.map((s) => (
            <Suspense key={s.key} fallback={null}>
              <SourceSection source={s} keyword={keyword} />
            </Suspense>
          ))}
        </div>
      </details>
    </>
  );
}

// Aggregated grid. Awaits every source so we can merge duplicates across
// sources into a single "N 源可看" card. The earlier pill row and the
// per-source <details> below use the same cachedSearchSource promises, so
// there's no double-fetch.
async function AggregatedResults({
  keyword,
  targets,
}: {
  keyword: string;
  targets: CmsSource[];
}) {
  const results = await Promise.all(
    targets.map(async (source) => ({ source, r: await cachedSearchSource(source, keyword) })),
  );
  const hits = results.flatMap(({ source, r }) =>
    r.ok ? r.items.map((item) => ({ source, item })) : [],
  );
  if (hits.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-surface/40 p-8 text-center text-sm text-muted-foreground">
        所有源都没有命中 &quot;{keyword}&quot;。试试去掉副标题或换关键字。
      </div>
    );
  }
  const groups = groupHitsByTitle(hits);
  const sharedCount = groups.filter((g) => g.others.length > 0).length;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-foreground">
          合并结果
          <span className="ml-2 text-xs font-normal text-dim-foreground">
            {groups.length} 部 · 其中 {sharedCount} 部多源
          </span>
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {groups.map((g) => (
          <GroupedVideoCard key={g.key} group={g} LinkComponent={NextLinkComponent} />
        ))}
      </div>
    </section>
  );
}

function AggregatedSkeleton() {
  return (
    <section>
      <div className="mb-3 h-4 w-24 animate-pulse rounded bg-surface/60" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => i).map((i) => (
          <div
            key={i}
            className="flex animate-pulse flex-col overflow-hidden rounded-lg border border-border/40 bg-surface/40"
          >
            <div className="aspect-[2/3] w-full bg-surface/60" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-3 w-3/4 rounded bg-surface/60" />
              <div className="h-3 w-1/2 rounded bg-surface/60" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

async function SourcePill({ source, keyword }: { source: CmsSource; keyword: string }) {
  const r = await cachedSearchSource(source, keyword);
  const tone: 'hit' | 'empty' | 'error' = !r.ok ? 'error' : r.items.length > 0 ? 'hit' : 'empty';

  return (
    <Link
      href={`/search?q=${encodeURIComponent(keyword)}&source=${encodeURIComponent(source.key)}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
        tone === 'hit' &&
          'border-success/50 bg-success/10 text-success hover:border-success hover:bg-success/15',
        tone === 'empty' &&
          'border-border/60 bg-surface/60 text-dim-foreground hover:border-border-strong hover:text-muted-foreground',
        tone === 'error' && 'border-danger/40 bg-danger/10 text-danger',
      )}
      title={r.error ?? ''}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          tone === 'hit' && 'bg-success',
          tone === 'empty' && 'bg-dim-foreground',
          tone === 'error' && 'bg-danger',
        )}
      />
      {source.name}
      <span className={cn(tone === 'hit' ? 'text-success/80' : 'text-dim-foreground')}>
        {r.items.length} · {r.tookMs}ms
      </span>
    </Link>
  );
}

// A full section per source: heading + grid. Empty / failed sources render
// nothing so the page stays dense. Keyed by source.key upstream so Suspense
// still streams each section independently.
async function SourceSection({ source, keyword }: { source: CmsSource; keyword: string }) {
  const r = await cachedSearchSource(source, keyword);
  if (!r.ok || r.items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-base font-medium text-foreground">
          {source.name}
          <span className="text-xs font-normal text-dim-foreground">
            {r.items.length} 条 · {r.tookMs}ms
          </span>
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {r.items.map((item) => (
          <VideoCard
            key={`${item.source}:${item.id}`}
            item={item}
            sourceName={source.name}
            hideSourceBadge
            LinkComponent={NextLinkComponent}
          />
        ))}
      </div>
    </section>
  );
}

function PillSkeleton({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-surface/40 px-3 py-1 text-xs text-dim-foreground">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60" />
      {label}
      <span className="animate-pulse">…</span>
    </span>
  );
}

function EmptyState({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone?: 'danger';
}) {
  return (
    <div
      className={cn(
        'mx-auto mt-12 max-w-md rounded-lg border p-8 text-center',
        tone === 'danger' ? 'border-danger/40 bg-danger/5' : 'border-border/70 bg-surface/60',
      )}
    >
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
