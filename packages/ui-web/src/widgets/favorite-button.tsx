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
  storage?: IStorage;
}

export function FavoriteButton({ source, sourceName, id, title, poster, storage }: Props) {
  const store = storage ?? localStorageBackend;
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    store
      .hasFavorite(source, id)
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

  async function toggle() {
    if (on === null) return;
    const next = !on;
    setOn(next);
    try {
      if (next) {
        await store.addFavorite({
          source,
          sourceName,
          id,
          title,
          poster,
          updatedAt: Date.now(),
        });
      } else {
        await store.removeFavorite(source, id);
      }
      invalidateCardMarkers();
    } catch {
      setOn(!next);
    }
  }

  const label = on ? '已收藏' : '收藏';

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
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {label}
    </button>
  );
}
