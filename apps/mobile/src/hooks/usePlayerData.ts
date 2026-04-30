import type { PlayLine } from '@marstv/core';
import { useEffect, useState } from 'react';

interface PlayerData {
  lines: PlayLine[];
  loading: boolean;
  error: string | null;
}

export function usePlayerData(source: string, id: string): PlayerData {
  const [lines, setLines] = useState<PlayLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // In production: fetch from API
        // const data = await fetchPlayerData(source, id);
        // if (!cancelled) setLines(data);
        await new Promise((r) => setTimeout(r, 800));
        if (!cancelled) setLines([]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (source && id) load();
    return () => {
      cancelled = true;
    };
  }, [source, id]);

  return { lines, loading, error };
}
