'use client';

// Home-page "追剧中" strip. On mount, reads subscriptions from localStorage
// and fires a single /api/subscriptions/check call to see which shows have
// new episodes. New-episode cards surface first (storage layer already sorts
// that way) and show a +N badge until the user clicks through — clicking
// navigates to the play page, which acknowledges and clears the badge.

import { invalidateCardMarkers } from '@/components/card-markers';
import { getClientStorage } from '@/lib/client-storage';
import type { SubscriptionRecord } from '@marstv/core';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const MAX_ITEMS = 12;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 min — don't re-check more often

interface CheckResult {
  source: string;
  id: string;
  ok: boolean;
  episodeCount?: number;
  lineName?: string;
}

export function SubscriptionRow() {
  const [items, setItems] = useState<SubscriptionRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const records = await getClientStorage().listSubscriptions();
      if (cancelled) return;
      setItems(records.slice(0, MAX_ITEMS));

      // Skip the network check if every record was checked very recently —
      // avoids thrashing upstream CMS on rapid home-page revisits.
      const stale = records.filter((r) => Date.now() - r.lastCheckedAt > CHECK_INTERVAL_MS);
      if (stale.length === 0) return;

      try {
        const resp = await fetch('/api/subscriptions/check', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            items: stale.map((r) => ({ source: r.source, id: r.id })),
          }),
        });
        if (!resp.ok) return;
        const json = (await resp.json()) as { results: CheckResult[] };
        const updates = json.results
          .filter(
            (r): r is CheckResult & { episodeCount: number } => r.ok && r.episodeCount != null,
          )
          .map((r) => ({
            source: r.source,
            id: r.id,
            latestEpisodeCount: r.episodeCount,
          }));
        if (updates.length === 0) return;
        await getClientStorage().updateSubscriptionChecks(updates);
        if (cancelled) return;
        const refreshed = await getClientStorage().listSubscriptions();
        if (!cancelled) {
          setItems(refreshed.slice(0, MAX_ITEMS));
          invalidateCardMarkers();
        }
      } catch {
        // Network / parse error — keep the cached list rendered, silent fail.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(source: string, id: string) {
    await getClientStorage().removeSubscription(source, id);
    setItems((prev) => (prev ?? []).filter((r) => !(r.source === source && r.id === id)));
    invalidateCardMarkers();
  }

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">追剧中</h2>
        <Link
          href="/subscriptions"
          className="text-xs text-dim-foreground transition-colors hover:text-primary"
        >
          全部订阅 →
        </Link>
      </div>
      <div className="scrollbar-thin -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {items.map((it) => {
          const href = `/play/${encodeURIComponent(it.source)}/${encodeURIComponent(it.id)}?line=${it.lineIdx}&ep=0`;
          const newCount = Math.max(0, it.latestEpisodeCount - it.knownEpisodeCount);
          const proxiedPoster = it.poster
            ? `/api/image/cms?u=${encodeURIComponent(it.poster)}`
            : null;
          return (
            <div
              key={`${it.source}:${it.id}`}
              className="group relative flex w-[140px] shrink-0 flex-col overflow-hidden rounded-md border border-border/60 bg-surface/60 transition-colors hover:border-primary/60"
            >
              <Link href={href} className="contents">
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
                  {proxiedPoster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={proxiedPoster}
                      alt={it.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-dim-foreground">
                      无封面
                    </div>
                  )}
                  {newCount > 0 ? (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-background shadow-md">
                      +{newCount} 新集
                    </span>
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1 text-[10px] text-foreground/90">
                    共 {it.latestEpisodeCount} 集
                  </span>
                </div>
                <div className="truncate px-2 py-1.5 text-xs text-foreground group-hover:text-primary">
                  {it.title}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => remove(it.source, it.id)}
                aria-label="取消追剧"
                className="absolute right-1.5 top-1.5 rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
