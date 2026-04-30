'use client';

import { invalidateCardMarkers } from '@/components/card-markers';
import {
  CollectionEmptyState,
  CollectionErrorState,
  PosterGridSkeleton,
} from '@/components/collection-skeleton';
import { getClientStorage } from '@/lib/client-storage';
import type { SubscriptionRecord } from '@marstv/core';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface CheckResult {
  source: string;
  id: string;
  ok: boolean;
  episodeCount?: number;
}

export default function SubscriptionsPage() {
  const [items, setItems] = useState<SubscriptionRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setError(null);
    try {
      const records = await getClientStorage().listSubscriptions();
      setItems(records);
    } catch (e: unknown) {
      setItems(null);
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  async function checkNow() {
    if (!items || items.length === 0 || refreshing) return;
    setRefreshing(true);
    try {
      const resp = await fetch('/api/subscriptions/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: items.map((r) => ({ source: r.source, id: r.id })),
        }),
      });
      if (!resp.ok) return;
      const json = (await resp.json()) as { results: CheckResult[] };
      const updates = json.results
        .filter((r): r is CheckResult & { episodeCount: number } => r.ok && r.episodeCount != null)
        .map((r) => ({
          source: r.source,
          id: r.id,
          latestEpisodeCount: r.episodeCount,
        }));
      await getClientStorage().updateSubscriptionChecks(updates);
      await fetchSubscriptions();
      invalidateCardMarkers();
    } finally {
      setRefreshing(false);
    }
  }

  async function remove(source: string, id: string) {
    await getClientStorage().removeSubscription(source, id);
    setItems((prev) => (prev ?? []).filter((r) => !(r.source === source && r.id === id)));
    invalidateCardMarkers();
  }

  async function clearAll() {
    if (!confirm('取消所有追剧订阅?')) return;
    await getClientStorage().clearSubscriptions();
    setItems([]);
    invalidateCardMarkers();
  }

  const wrapper = 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8';

  if (items === null && !error) {
    return (
      <div className={wrapper}>
        <h1 className="mb-6 text-2xl font-semibold">我的追剧</h1>
        <PosterGridSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={wrapper}>
        <h1 className="mb-6 text-2xl font-semibold">我的追剧</h1>
        <CollectionErrorState description={error} onRetry={fetchSubscriptions} />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className={wrapper}>
        <h1 className="mb-6 text-2xl font-semibold">我的追剧</h1>
        <CollectionEmptyState
          title="我的追剧"
          description={'还没有追剧。在播放页点“追剧”就会出现在这里。新集上线时会自动提醒。'}
        />
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">我的追剧</h1>
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={checkNow}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface/60 px-3 py-1 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {refreshing ? '检查中…' : '立即检查更新'}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-muted-foreground hover:text-danger"
          >
            清空
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it) => {
          const newCount = Math.max(0, it.latestEpisodeCount - it.knownEpisodeCount);
          const href = `/play/${encodeURIComponent(it.source)}/${encodeURIComponent(it.id)}?line=${it.lineIdx}&ep=0`;
          return (
            <div
              key={`${it.source}:${it.id}`}
              className="group relative overflow-hidden rounded-lg border border-border/60 bg-surface/40"
            >
              <Link href={href} className="block">
                <div className="relative aspect-[2/3] w-full bg-surface">
                  {it.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/image/cms?u=${encodeURIComponent(it.poster)}`}
                      alt={it.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  {newCount > 0 ? (
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-background shadow-md">
                      +{newCount} 新集
                    </span>
                  ) : null}
                </div>
                <div className="p-2">
                  <div className="truncate text-sm font-medium text-foreground">{it.title}</div>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] tracking-wide text-dim-foreground">
                    <span className="truncate">{it.sourceName ?? it.source}</span>
                    <span>共 {it.latestEpisodeCount} 集</span>
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => remove(it.source, it.id)}
                className="absolute right-2 top-2 rounded-full bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                取消
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
