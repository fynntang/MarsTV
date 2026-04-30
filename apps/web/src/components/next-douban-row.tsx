import { NextLinkComponent } from '@/lib/next-adapter';
import { type DoubanItem, type DoubanMediaType, searchDouban } from '@marstv/core';
import { DoubanRow } from '@marstv/ui-web';
import { Suspense } from 'react';

interface Props {
  type: DoubanMediaType;
  tag: string;
  title: string;
  limit?: number;
}

export function NextDoubanRow(props: Props) {
  return (
    <Suspense fallback={<RowSkeleton count={props.limit ?? 12} />}>
      <NextDoubanRowBody {...props} />
    </Suspense>
  );
}

async function NextDoubanRowBody({ type, tag, title, limit = 12 }: Props) {
  let items: DoubanItem[] = [];
  try {
    const r = await searchDouban({ type, tag, pageSize: limit, timeoutMs: 6000 });
    items = r.items;
  } catch {
    items = [];
  }
  return (
    <DoubanRow
      type={type}
      tag={tag}
      title={title}
      limit={limit}
      items={items}
      LinkComponent={NextLinkComponent}
    />
  );
}

const SKELETON_KEYS = Array.from({ length: 24 }, () => Math.random().toString(36).slice(2, 10));

function RowSkeleton({ count }: { count: number }) {
  return (
    <section className="mt-12">
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
    </section>
  );
}
