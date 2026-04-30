'use client';

import { getClientStorage } from '@/lib/client-storage';
import { NextLinkComponent } from '@/lib/next-adapter';
import type { SubscriptionRecord } from '@marstv/core';
import { SubscriptionRow, invalidateCardMarkers } from '@marstv/ui-web';
import { useEffect, useState } from 'react';

const MAX_ITEMS = 12;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

interface CheckResult {
  source: string;
  id: string;
  ok: boolean;
  episodeCount?: number;
  lineName?: string;
}

export function NextSubscriptionRow() {
  const [items, setItems] = useState<SubscriptionRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const records = await getClientStorage().listSubscriptions();
      if (cancelled) return;
      setItems(records.slice(0, MAX_ITEMS));

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

  return <SubscriptionRow items={items} onRemove={remove} LinkComponent={NextLinkComponent} />;
}
