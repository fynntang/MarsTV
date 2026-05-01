'use client';

import type { DoubanItem, DoubanMediaType } from '@marstv/core';
import type { LinkComponent } from '../lib/link-component';
import { DefaultLink } from '../lib/link-component';
import { AvailabilityBadge } from './availability-badge';

interface Props {
  type: DoubanMediaType;
  tag: string;
  title: string;
  limit?: number;
  /** Fetched douban items. null = loading, [] = error/empty. */
  items: DoubanItem[] | null;
  /** Link component for navigation. Defaults to plain <a>. */
  LinkComponent?: LinkComponent;
}

export function DoubanRow({
  type,
  tag,
  title,
  limit = 12,
  items,
  LinkComponent = DefaultLink,
}: Props) {
  const moreHref = `/douban?type=${type}&tag=${encodeURIComponent(tag)}`;

  return (
    <section className="mt-14">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="section-title text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <LinkComponent
          href={moreHref}
          className="text-[11px] text-dim-foreground transition-colors hover:text-primary"
        >
          豆瓣 · {tag} →
        </LinkComponent>
      </div>
      {items === null ? (
        <RowSkeleton count={limit} />
      ) : items.length === 0 ? (
        <RowError />
      ) : (
        <div className="scrollbar-thin scroll-fade scroll-x pb-2">
          <div className="flex w-max gap-3 sm:gap-4">
            {items.map((item) => (
              <DoubanCard key={item.id} item={item} LinkComponent={LinkComponent} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DoubanCard({
  item,
  LinkComponent = DefaultLink,
}: {
  item: DoubanItem;
  LinkComponent?: LinkComponent;
}) {
  // Douban entries aren't CMS items — clicking searches the title across all
  // configured sources so the user can pick a source to actually play from.
  const proxiedCover = `/api/image/douban?u=${encodeURIComponent(item.cover)}`;
  const searchParams = new URLSearchParams({ q: item.title });
  if (item.cover) searchParams.set('dbCover', item.cover);
  if (item.rate) searchParams.set('dbRate', item.rate);
  if (item.url) searchParams.set('db', item.url);
  return (
    <LinkComponent
      href={`/search?${searchParams.toString()}`}
      className="group glass-card relative flex w-[140px] sm:w-[160px] lg:w-[180px] shrink-0 flex-col overflow-hidden rounded-xl"
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
    </LinkComponent>
  );
}

// Stable keys for the skeleton row — avoids array-index-as-key churn.
const SKELETON_KEYS = Array.from({ length: 24 }, () => Math.random().toString(36).slice(2, 10));

function RowSkeleton({ count }: { count: number }) {
  return (
    <div className="overflow-hidden pb-2">
      <div className="flex w-max gap-3 sm:gap-4">
        {SKELETON_KEYS.slice(0, count).map((k) => (
          <div
            key={k}
            className="glass-card w-[140px] sm:w-[160px] lg:w-[180px] shrink-0 animate-pulse overflow-hidden rounded-xl"
          >
            <div className="aspect-[2/3] w-full bg-surface/60" />
            <div className="h-7 px-2 py-1.5">
              <div className="h-3 w-3/4 rounded bg-surface/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RowError() {
  return (
    <div className="glass-card rounded-xl px-4 py-8 text-center text-xs text-dim-foreground">
      豆瓣暂不可用
    </div>
  );
}
