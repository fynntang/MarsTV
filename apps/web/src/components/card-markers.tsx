'use client';

// Reads history + favorites from localStorage and renders small corner markers
// on top of a video card. Snapshot is cached per page view and invalidated
// when a favorite is toggled or an entry is removed. Cross-tab changes are
// picked up via the 'storage' event.

import { getClientStorage } from '@/lib/client-storage';
import type { PlayRecord, SubscriptionRecord } from '@marstv/core';
import { useEffect, useState } from 'react';

interface Snapshot {
  history: Map<string, PlayRecord>;
  favorites: Set<string>;
  subscriptions: Map<string, SubscriptionRecord>;
}

function makeKey(source: string, id: string): string {
  return `${source}:${id}`;
}

let cachedSnapshot: Snapshot | null = null;
let inFlight: Promise<Snapshot> | null = null;
const subscribers = new Set<() => void>();

async function loadSnapshot(): Promise<Snapshot> {
  if (cachedSnapshot) return cachedSnapshot;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const storage = getClientStorage();
    const [history, favorites, subscriptions] = await Promise.all([
      storage.listPlayRecords(),
      storage.listFavorites(),
      storage.listSubscriptions(),
    ]);
    const snapshot: Snapshot = {
      history: new Map(history.map((r) => [makeKey(r.source, r.id), r])),
      favorites: new Set(favorites.map((f) => makeKey(f.source, f.id))),
      subscriptions: new Map(subscriptions.map((s) => [makeKey(s.source, s.id), s])),
    };
    cachedSnapshot = snapshot;
    inFlight = null;
    return snapshot;
  })();
  return inFlight;
}

function notify() {
  for (const fn of subscribers) fn();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (
      e.key === 'marstv:history' ||
      e.key === 'marstv:favorites' ||
      e.key === 'marstv:subscriptions'
    ) {
      cachedSnapshot = null;
      notify();
    }
  });
}

export function invalidateCardMarkers(): void {
  cachedSnapshot = null;
  notify();
}

export function CardMarkers({ source, id }: { source: string; id: string }) {
  // Always start null on first render. The module-level cachedSnapshot is a
  // client-only perf cache; reading it during SSR-paired hydration would
  // diverge from the server render (which always sees null).
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      loadSnapshot().then((s) => {
        if (!cancelled) setSnapshot(s);
      });
    };
    sync();
    subscribers.add(sync);
    return () => {
      cancelled = true;
      subscribers.delete(sync);
    };
  }, []);

  if (!snapshot) return null;

  const key = makeKey(source, id);
  const history = snapshot.history.get(key);
  const favorited = snapshot.favorites.has(key);
  const subscription = snapshot.subscriptions.get(key);
  const newEpisodes = subscription
    ? Math.max(0, subscription.latestEpisodeCount - subscription.knownEpisodeCount)
    : 0;

  if (!history && !favorited && !subscription) return null;

  const pct =
    history && history.durationSec > 0
      ? Math.min(100, Math.floor((history.positionSec / history.durationSec) * 100))
      : 0;

  return (
    <>
      {favorited ? (
        <span
          className="absolute left-2 top-2 inline-flex items-center justify-center rounded-full bg-danger/80 px-1.5 py-0.5 text-[10px] font-medium text-background shadow-md backdrop-blur-sm"
          title="已收藏"
        >
          ❤
        </span>
      ) : null}
      {newEpisodes > 0 ? (
        <span
          className="absolute right-2 top-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-background shadow-md"
          title={`追剧 · 新增 ${newEpisodes} 集`}
        >
          +{newEpisodes}
        </span>
      ) : subscription ? (
        <span
          className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/80 text-[9px] text-background shadow-md"
          title="追剧中"
        >
          🔔
        </span>
      ) : null}
      {history ? (
        <span
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-4 text-[10px] text-foreground/90"
          title={`已看 ${pct}%`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="truncate">
              {history.lineName ?? `线路 ${history.lineIdx + 1}`} · 第 {history.epIdx + 1} 集
            </span>
            {pct > 0 ? <span className="shrink-0 text-primary">{pct}%</span> : null}
          </span>
          {pct > 0 ? (
            <span className="mt-0.5 block h-0.5 w-full overflow-hidden rounded-full bg-white/20">
              <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );
}
