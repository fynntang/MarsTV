'use client';

import { type IStorage, localStorageBackend } from '@marstv/core';
import { useEffect, useState } from 'react';
import { invalidateCardMarkers } from './card-markers';

interface Props {
  source: string;
  sourceName?: string;
  id: string;
  title: string;
  poster?: string;
  lineIdx: number;
  lineName?: string;
  episodeCount: number;
  storage?: IStorage;
}

export function SubscribeButton({
  source,
  sourceName,
  id,
  title,
  poster,
  lineIdx,
  lineName,
  episodeCount,
  storage,
}: Props) {
  const store = storage ?? localStorageBackend;
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    store
      .hasSubscription(source, id)
      .then((v) => {
        if (!cancelled) setOn(v);
      })
      .catch(() => {
        if (!cancelled) setOn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, id, store]);

  useEffect(() => {
    if (on !== true) return;
    store
      .acknowledgeSubscription(source, id)
      .then(() => invalidateCardMarkers())
      .catch(() => {});
  }, [on, source, id, store]);

  async function toggle() {
    if (on === null) return;
    const next = !on;
    setOn(next);
    try {
      if (next) {
        const now = Date.now();
        await store.putSubscription({
          source,
          sourceName,
          id,
          title,
          poster,
          lineIdx,
          lineName,
          knownEpisodeCount: episodeCount,
          latestEpisodeCount: episodeCount,
          subscribedAt: now,
          lastCheckedAt: now,
        });
      } else {
        await store.removeSubscription(source, id);
      }
      invalidateCardMarkers();
    } catch {
      setOn(!next);
    }
  }

  const label = on ? '已追剧' : '追剧';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={on === null}
      aria-pressed={on === true}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
        on
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border/70 bg-surface/70 text-muted-foreground hover:border-primary hover:text-primary'
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
      </svg>
      {label}
    </button>
  );
}
