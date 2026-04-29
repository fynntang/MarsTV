'use client';

import { invalidateCardMarkers } from '@/components/card-markers';
import { type PlayRecord, localStorageBackend } from '@marstv/core';
import Link from 'next/link';
import { useEffect, useState } from 'react';

function formatPos(p: number, d: number): string {
  if (!Number.isFinite(p) || p <= 0) return '';
  const pct = d > 0 ? Math.min(100, Math.floor((p / d) * 100)) : 0;
  return d > 0 ? `${pct}%` : `${Math.floor(p)}s`;
}

export default function HistoryPage() {
  const [items, setItems] = useState<PlayRecord[] | null>(null);

  useEffect(() => {
    localStorageBackend
      .listPlayRecords()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  async function remove(source: string, id: string) {
    await localStorageBackend.removePlayRecord(source, id);
    setItems((prev) => (prev ?? []).filter((r) => !(r.source === source && r.id === id)));
    invalidateCardMarkers();
  }

  async function clearAll() {
    if (!confirm('清空全部历史?')) return;
    await localStorageBackend.clearPlayRecords();
    setItems([]);
    invalidateCardMarkers();
  }

  if (items === null) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
        <h1 className="mb-6 text-2xl font-semibold">观看历史</h1>
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
        <h1 className="mb-6 text-2xl font-semibold">观看历史</h1>
        <div className="rounded-lg border border-border/60 bg-surface/40 p-8 text-center text-sm text-muted-foreground">
          还没有观看记录。播放任意视频后会自动出现在这里。
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">观看历史</h1>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-muted-foreground hover:text-danger"
        >
          清空
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it) => {
          const href = `/play/${encodeURIComponent(it.source)}/${encodeURIComponent(it.id)}?line=${it.lineIdx}&ep=${it.epIdx}`;
          const pct =
            it.durationSec > 0 ? Math.min(100, (it.positionSec / it.durationSec) * 100) : 0;
          return (
            <div
              key={`${it.source}:${it.id}`}
              className="group relative overflow-hidden rounded-lg border border-border/60 bg-surface/40"
            >
              <Link href={href} className="block">
                <div className="aspect-[2/3] w-full bg-surface">
                  {it.poster ? (
                    <img
                      src={`/api/image/cms?u=${encodeURIComponent(it.poster)}`}
                      alt={it.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-2">
                  <div className="truncate text-sm font-medium text-foreground">{it.title}</div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-dim-foreground">
                    <span className="truncate tracking-wide">{it.sourceName ?? it.source}</span>
                    <span className="shrink-0">
                      {it.lineName ?? `线路 ${it.lineIdx + 1}`} · 第 {it.epIdx + 1} 集
                    </span>
                  </div>
                  {pct > 0 ? (
                    <div className="mt-1 h-1 w-full overflow-hidden rounded bg-border/40">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  ) : null}
                  <div className="mt-1 text-[10px] text-dim-foreground">
                    {formatPos(it.positionSec, it.durationSec)}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => remove(it.source, it.id)}
                className="absolute right-2 top-2 rounded-full bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                移除
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
