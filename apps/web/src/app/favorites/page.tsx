'use client';

import { invalidateCardMarkers } from '@/components/card-markers';
import { type FavoriteRecord, localStorageBackend } from '@marstv/core';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteRecord[] | null>(null);

  useEffect(() => {
    localStorageBackend
      .listFavorites()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  async function remove(source: string, id: string) {
    await localStorageBackend.removeFavorite(source, id);
    setItems((prev) => (prev ?? []).filter((r) => !(r.source === source && r.id === id)));
    invalidateCardMarkers();
  }

  async function clearAll() {
    if (!confirm('清空全部收藏?')) return;
    await localStorageBackend.clearFavorites();
    setItems([]);
    invalidateCardMarkers();
  }

  if (items === null) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
        <h1 className="mb-6 text-2xl font-semibold">我的收藏</h1>
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
        <h1 className="mb-6 text-2xl font-semibold">我的收藏</h1>
        <div className="rounded-lg border border-border/60 bg-surface/40 p-8 text-center text-sm text-muted-foreground">
          还没有收藏。在播放页点"收藏"就会出现在这里。
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的收藏</h1>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-muted-foreground hover:text-danger"
        >
          清空
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it) => (
          <div
            key={`${it.source}:${it.id}`}
            className="group relative overflow-hidden rounded-lg border border-border/60 bg-surface/40"
          >
            <Link
              href={`/play/${encodeURIComponent(it.source)}/${encodeURIComponent(it.id)}`}
              className="block"
            >
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
                <div className="mt-0.5 text-[11px] tracking-wide text-dim-foreground">
                  {it.sourceName ?? it.source}
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
        ))}
      </div>
    </div>
  );
}
