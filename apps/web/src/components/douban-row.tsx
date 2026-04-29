import { AvailabilityBadge } from '@/components/availability-badge';
import { type DoubanItem, type DoubanMediaType, searchDouban } from '@marstv/core';
import Link from 'next/link';
import { Suspense } from 'react';

interface Props {
  type: DoubanMediaType;
  tag: string;
  title: string;
  limit?: number;
}

// Server component row. Wrap in <Suspense> at the call site to stream.
export function DoubanRow(props: Props) {
  const moreHref = `/douban?type=${props.type}&tag=${encodeURIComponent(props.tag)}`;
  return (
    <section className="mt-12">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{props.title}</h2>
        <Link
          href={moreHref}
          className="text-xs text-dim-foreground transition-colors hover:text-primary"
        >
          豆瓣 · {props.tag} →
        </Link>
      </div>
      <Suspense fallback={<RowSkeleton count={props.limit ?? 12} />}>
        <RowBody {...props} />
      </Suspense>
    </section>
  );
}

async function RowBody({ type, tag, limit = 12 }: Props) {
  let items: DoubanItem[] = [];
  try {
    const r = await searchDouban({ type, tag, pageSize: limit, timeoutMs: 6000 });
    items = r.items;
  } catch {
    return <RowError />;
  }
  if (items.length === 0) return <RowError />;
  return (
    <div className="scrollbar-thin -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {items.map((item) => (
        <DoubanCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function DoubanCard({ item }: { item: DoubanItem }) {
  // Douban entries aren't CMS items — clicking searches the title across all
  // configured sources so the user can pick a source to actually play from.
  const proxiedCover = `/api/image/douban?u=${encodeURIComponent(item.cover)}`;
  const searchParams = new URLSearchParams({ q: item.title });
  if (item.cover) searchParams.set('dbCover', item.cover);
  if (item.rate) searchParams.set('dbRate', item.rate);
  if (item.url) searchParams.set('db', item.url);
  return (
    <Link
      href={`/search?${searchParams.toString()}`}
      className="group relative flex w-[140px] shrink-0 flex-col overflow-hidden rounded-md border border-border/60 bg-surface/60 transition-colors hover:border-primary/60"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element — poster comes from douban via our proxy */}
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

// Stable keys for the skeleton row — avoids array-index-as-key churn.
const SKELETON_KEYS = Array.from({ length: 24 }, () => Math.random().toString(36).slice(2, 10));

function RowSkeleton({ count }: { count: number }) {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2">
      {SKELETON_KEYS.slice(0, count).map((k) => (
        <div
          key={k}
          className="w-[140px] shrink-0 animate-pulse overflow-hidden rounded-md border border-border/40 bg-surface/40"
        >
          <div className="aspect-[2/3] w-full bg-surface/60" />
          <div className="h-7 px-2 py-1.5">
            <div className="h-3 w-3/4 rounded bg-surface/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RowError() {
  return (
    <div className="rounded-md border border-border/40 bg-surface/30 px-4 py-6 text-center text-xs text-dim-foreground">
      豆瓣暂不可用
    </div>
  );
}
