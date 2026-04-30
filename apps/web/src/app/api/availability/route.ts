// ============================================================================
// GET /api/availability?q=<title>
// Lightweight preflight for Douban cards — given a title, returns how many
// configured CMS sources have at least one matching video. Used to badge
// Douban cards with "N 源可看" before the user clicks through.
//
// Caches aggressively per-keyword (in-memory) so 24 Douban cards searching
// the same title in parallel only fan out to CMS once.
// ============================================================================

import { requireApiPassword } from '@/lib/site-password-guard';
import { sourceHealthStore } from '@/lib/source-health-store';
import { loadSources } from '@/lib/sources';
import { aggregateSearch } from '@marstv/core';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CacheEntry {
  count: number;
  sourceCount: number;
  expiresAt: number;
}

// Short-lived in-memory cache. Per-instance, not shared across edge replicas,
// but fine for a self-hosted deployment. 10 minutes balances freshness vs.
// upstream pressure on commonly-searched titles.
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

function normalize(title: string): string {
  return title.replace(/\s+/g, '').toLowerCase();
}

function isExpired(entry: CacheEntry): boolean {
  return entry.expiresAt < Date.now();
}

async function compute(keyword: string): Promise<CacheEntry> {
  const sources = loadSources();
  if (sources.length === 0) {
    return { count: 0, sourceCount: 0, expiresAt: Date.now() + CACHE_TTL_MS };
  }

  const result = await aggregateSearch(sources, keyword, {
    perSourceTimeoutMs: 6000,
    maxPage: 1,
    healthStore: sourceHealthStore,
  });

  // Aggregate dedupes by (title, year); for availability we really care about
  // how many raw per-source hits contain the exact keyword — a Douban title
  // like "凡人修仙传" shouldn't match random 凡人-prefixed shows, so filter by
  // case-insensitive substring of the normalized keyword.
  const needle = normalize(keyword);
  const hits = result.items.filter((it) => normalize(it.title).includes(needle));
  const sourceCount = result.sourceStats.filter((s) => s.ok && s.itemCount > 0).length;

  return {
    count: hits.length,
    sourceCount,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

async function getEntry(keyword: string): Promise<CacheEntry> {
  const key = normalize(keyword);
  const cached = cache.get(key);
  if (cached && !isExpired(cached)) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = compute(keyword).then((entry) => {
    cache.set(key, entry);
    inflight.delete(key);
    return entry;
  });
  inflight.set(key, promise);
  return promise;
}

export async function GET(request: NextRequest) {
  const auth = requireApiPassword(request);
  if (auth) return auth;

  const keyword = request.nextUrl.searchParams.get('q')?.trim();
  if (!keyword) {
    return Response.json({ error: "query 'q' is required" }, { status: 400 });
  }

  try {
    const entry = await getEntry(keyword);
    return Response.json(
      { count: entry.count, sourceCount: entry.sourceCount },
      {
        headers: {
          // Safe to share across users — only depends on server's CMS config,
          // not on the viewer. Let the CDN / browser cache briefly.
          'cache-control': 'public, max-age=60, stale-while-revalidate=600',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  }
}
