'use client';

import { getClientStorage } from '@/lib/client-storage';
import type { FavoriteRecord } from '@marstv/core';
import {
  CollectionEmptyState,
  CollectionErrorState,
  PosterGridSkeleton,
  invalidateCardMarkers,
} from '@marstv/ui-web';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(() => {
    setError(null);
    setItems(null);
    getClientStorage()
      .listFavorites()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '加载失败'));
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  async function remove(source: string, id: string) {
    await getClientStorage().removeFavorite(source, id);
    setItems((prev) => (prev ?? []).filter((r) => !(r.source === source && r.id === id)));
    invalidateCardMarkers();
  }

  async function clearAll() {
    if (!confirm('清空全部收藏?')) return;
    await getClientStorage().clearFavorites();
    setItems([]);
    invalidateCardMarkers();
  }

  const wrapper = 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8';

  if (items === null && !error) {
    return (
      <div className={wrapper}>
        <h1 className="mb-6 text-2xl font-semibold">我的收藏</h1>
        <PosterGridSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={wrapper}>
        <h1 className="mb-6 text-2xl font-semibold">我的收藏</h1>
        <CollectionErrorState description={error} onRetry={fetchFavorites} />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className={wrapper}>
        <h1 className="mb-6 text-2xl font-semibold">我的收藏</h1>
        <CollectionEmptyState
          title="我的收藏"
          description='还没有收藏。在播放页点"收藏"就会出现在这里。'
        />
      </div>
    );
  }

  return (
    <div className={wrapper}>
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
