'use client';

// Home-page "continue watching" strip. Reads the local PlayRecord store and
// renders half-watched items (progress < 95%) as resume cards. Hidden entirely
// on first-visit / empty state so the hero section stays clean.

import { invalidateCardMarkers } from '@/components/card-markers';
import { getClientStorage } from '@/lib/client-storage';
import type { PlayRecord } from '@marstv/core';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const FINISHED_THRESHOLD = 0.95;
const MAX_ITEMS = 12;

function usable(r: PlayRecord): boolean {
  if (!(r.durationSec > 0)) return true; // no duration → keep, user can resume from saved sec
  return r.positionSec / r.durationSec < FINISHED_THRESHOLD;
}

export function ContinueWatchingRow() {
  // Start undefined to distinguish "loading" (skip render) from "empty" (also
  // skip render). Only mount the section once we confirm there's at least one
  // usable record.
  const [items, setItems] = useState<PlayRecord[] | null>(null);

  useEffect(() => {
    getClientStorage()
      .listPlayRecords()
      .then((records) => setItems(records.filter(usable).slice(0, MAX_ITEMS)))
      .catch(() => setItems([]));
  }, []);

  async function remove(source: string, id: string) {
    await getClientStorage().removePlayRecord(source, id);
    setItems((prev) => (prev ?? []).filter((r) => !(r.source === source && r.id === id)));
    invalidateCardMarkers();
  }

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">继续观看</h2>
        <Link
          href="/history"
          className="text-xs text-dim-foreground transition-colors hover:text-primary"
        >
          全部历史 →
        </Link>
      </div>
      <div className="scrollbar-thin -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {items.map((it) => {
          const href = `/play/${encodeURIComponent(it.source)}/${encodeURIComponent(it.id)}?line=${it.lineIdx}&ep=${it.epIdx}`;
          const pct =
            it.durationSec > 0
              ? Math.min(100, Math.floor((it.positionSec / it.durationSec) * 100))
              : 0;
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
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1 text-[10px] text-foreground/90">
                    {it.lineName ?? `线路 ${it.lineIdx + 1}`} · 第 {it.epIdx + 1} 集
                  </span>
                  {pct > 0 ? (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  ) : null}
                </div>
                <div className="truncate px-2 py-1.5 text-xs text-foreground group-hover:text-primary">
                  {it.title}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => remove(it.source, it.id)}
                aria-label="从继续观看移除"
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
