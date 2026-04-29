'use client';

// Per-episode "已看" bullet on the episode grid. Reads localStorage
// `marstv:progress:<source>:<id>:<line>:<ep>` (written by PlayerEmbed) for
// every episode; anything with a non-zero value is considered watched.

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Episode {
  title: string;
  url: string;
}

interface Props {
  source: string;
  id: string;
  lineIdx: number;
  currentEpIdx: number;
  episodes: Episode[];
}

const PROGRESS_PREFIX = 'marstv:progress:';

function readAllProgress(source: string, id: string, lineIdx: number, count: number): Set<number> {
  const watched = new Set<number>();
  try {
    const prefix = `${PROGRESS_PREFIX}${source}:${id}:${lineIdx}:`;
    for (let i = 0; i < count; i++) {
      const raw = localStorage.getItem(prefix + i);
      if (!raw) continue;
      const n = Number.parseFloat(raw);
      if (Number.isFinite(n) && n > 0) watched.add(i);
    }
  } catch {
    // ignore
  }
  return watched;
}

export function EpisodeGrid({ source, id, lineIdx, currentEpIdx, episodes }: Props) {
  const [watched, setWatched] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setWatched(readAllProgress(source, id, lineIdx, episodes.length));

    // Pick up cross-tab updates. Own-tab writes from PlayerEmbed don't fire
    // 'storage' events, but the user is unlikely to be scrubbing through the
    // episode grid while simultaneously playing.
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith(`${PROGRESS_PREFIX}${source}:${id}:${lineIdx}:`)) {
        setWatched(readAllProgress(source, id, lineIdx, episodes.length));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [source, id, lineIdx, episodes.length]);

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
      {episodes.map((ep, i) => {
        const isActive = i === currentEpIdx;
        const isWatched = !isActive && watched.has(i);
        return (
          <Link
            key={`${ep.title}:${i}`}
            href={`/play/${encodeURIComponent(source)}/${encodeURIComponent(id)}?line=${lineIdx}&ep=${i}`}
            scroll={false}
            className={cn(
              'relative truncate rounded-md border px-2 py-1.5 text-center text-xs transition-colors',
              isActive
                ? 'border-primary bg-primary/15 text-primary'
                : isWatched
                  ? 'border-border/60 bg-surface/60 text-foreground/80 hover:border-border-strong hover:text-foreground'
                  : 'border-border/60 bg-surface/60 text-muted-foreground hover:border-border-strong hover:text-foreground',
            )}
            title={isWatched ? `${ep.title} · 已看` : ep.title}
          >
            {ep.title}
            {isWatched ? (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary/70"
              />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
