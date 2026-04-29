// ============================================================================
// Per-source search memoized with React cache() so both the pill stat row
// and the video cards grid can read the same promise without re-fetching.
// Enables independent <Suspense> boundaries per source for RSC streaming.
// ============================================================================

import { type CmsSource, type VideoItem, searchSource } from '@marstv/core';
import { cache } from 'react';

export interface SourceSearch {
  ok: boolean;
  items: VideoItem[];
  tookMs: number;
  error?: string;
}

export const cachedSearchSource = cache(
  async (source: CmsSource, keyword: string): Promise<SourceSearch> => {
    const start = Date.now();
    try {
      const r = await searchSource(source, keyword, 1, { timeoutMs: 8000 });
      return { ok: true, items: r.items, tookMs: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        items: [],
        tookMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
);
