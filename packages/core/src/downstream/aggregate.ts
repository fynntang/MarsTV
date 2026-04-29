// ============================================================================
// 多源并发聚合搜索:对每个启用源发起搜索,失败隔离,结果合并去重
// ============================================================================

import type { CmsSource, VideoItem } from '../types/index';
import { type SearchResult, searchSource } from './apple-cms';
import {
  type ISourceHealthStore,
  dynamicTimeout,
  scoreSource,
  shouldSkipSource,
} from './source-health';

export interface AggregateSearchOptions {
  /** 单源超时毫秒,默认 8000 */
  perSourceTimeoutMs?: number;
  /** 最大页数(0 表示只取 page 1),默认 1 */
  maxPage?: number;
  /** 外部 cancel signal */
  signal?: AbortSignal;
  /** If provided, failing sources get downranked/skipped and stats get persisted */
  healthStore?: ISourceHealthStore;
}

export interface AggregateSearchResult {
  /** 合并去重后的结果 */
  items: VideoItem[];
  /** 每个源的搜索耗时与失败信息 */
  sourceStats: {
    source: string;
    ok: boolean;
    tookMs: number;
    itemCount: number;
    error?: string;
  }[];
}

/**
 * 聚合搜索:并发所有启用源,单源失败不影响整体
 *
 * 去重策略:按 (title 规范化, year) 去重,同名同年合并到第一次出现的源下。
 * 这是弱去重,主要避免显而易见的重复卡片;真正的跨源同视频识别留到 /api/detail 做。
 */
export async function aggregateSearch(
  sources: CmsSource[],
  keyword: string,
  options: AggregateSearchOptions = {},
): Promise<AggregateSearchResult> {
  const { perSourceTimeoutMs = 8000, maxPage = 1, signal, healthStore } = options;

  const enabled = sources.filter((s) => s.enabled !== false);
  if (enabled.length === 0) return { items: [], sourceStats: [] };

  // Resolve health scores upfront so we can sort results later and decide skips.
  const healthScores = new Map<string, number>();
  if (healthStore) {
    const all = await healthStore.list();
    for (const rec of all) {
      healthScores.set(rec.sourceKey, scoreSource(rec));
    }
  }

  const now = Date.now();

  const tasks = enabled.map(async (source) => {
    // Check health before dispatching.
    if (healthStore) {
      const rec = await healthStore.get(source.key);
      if (shouldSkipSource(rec, now)) {
        return {
          source: source.key,
          ok: false as const,
          tookMs: 0,
          itemCount: 0,
          error: 'skipped: unhealthy',
          items: [] as VideoItem[],
        };
      }
    }

    const score = healthScores.get(source.key) ?? 0.5;
    const effectiveTimeout = healthStore
      ? dynamicTimeout(score, perSourceTimeoutMs)
      : perSourceTimeoutMs;

    const start = Date.now();
    try {
      const pages = Math.max(1, maxPage);
      const results: SearchResult[] = [];
      for (let p = 1; p <= pages; p++) {
        const r = await searchSource(source, keyword, p, {
          timeoutMs: effectiveTimeout,
          signal,
        });
        results.push(r);
        if (r.page >= r.pageCount) break;
      }
      const items = results.flatMap((r) => r.items);
      const tookMs = Date.now() - start;

      if (healthStore) {
        await healthStore.recordOk(source.key, tookMs);
      }

      return {
        source: source.key,
        ok: true as const,
        tookMs,
        itemCount: items.length,
        items,
      };
    } catch (err) {
      const tookMs = Date.now() - start;

      if (healthStore) {
        await healthStore.recordFail(source.key, err instanceof Error ? err.message : String(err));
      }

      return {
        source: source.key,
        ok: false as const,
        tookMs,
        itemCount: 0,
        error: err instanceof Error ? err.message : String(err),
        items: [] as VideoItem[],
      };
    }
  });

  const settled = await Promise.all(tasks);

  // If healthStore is active, sort settled results by score descending so
  // healthier sources appear first in the merged output. Ties keep original order.
  if (healthStore) {
    settled.sort((a, b) => {
      const scoreA = healthScores.get(a.source) ?? 0.5;
      const scoreB = healthScores.get(b.source) ?? 0.5;
      return scoreB - scoreA;
    });
  }

  const merged: VideoItem[] = [];
  const seen = new Set<string>();
  for (const r of settled) {
    for (const item of r.items) {
      const dedupKey = normalizeKey(item.title, item.year);
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      merged.push(item);
    }
  }

  return {
    items: merged,
    sourceStats: settled.map(({ source, ok, tookMs, itemCount, error }) => ({
      source,
      ok,
      tookMs,
      itemCount,
      error,
    })),
  };
}

function normalizeKey(title: string, year?: string): string {
  // 统一全半角、去除空白、小写,避免明显重复
  const normalized = title.replace(/\s+/g, '').replace(/[　]/g, '').toLowerCase();
  return `${normalized}|${year ?? ''}`;
}
