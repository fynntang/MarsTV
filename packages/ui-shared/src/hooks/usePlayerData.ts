import type { PlayLine, VideoDetail } from '@marstv/core';
import { useEffect, useState } from 'react';
import { getDetail } from '../lib/api-client';

export interface PlayerData {
  lines: PlayLine[];
  videoDetail: VideoDetail | null;
  loading: boolean;
  error: string | null;
}

export function usePlayerData(source: string, id: string): PlayerData {
  const [lines, setLines] = useState<PlayLine[]>([]);
  const [videoDetail, setVideoDetail] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDetail(source, id);
        if (cancelled) return;
        if (data) {
          const detail = data as unknown as VideoDetail;
          setVideoDetail(detail);
          setLines(detail.lines ?? []);
        } else {
          setLines([]);
          setError('Failed to load video detail');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (source && id) load();
    return () => { cancelled = true; };
  }, [source, id]);

  return { lines, videoDetail, loading, error };
}
