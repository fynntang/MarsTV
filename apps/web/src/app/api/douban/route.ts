// ============================================================================
// GET /api/douban?type=movie|tv&tag=<tag>&pagesize=<n>&pagestart=<n>&sort=<s>
// Thin proxy over movie.douban.com/j/search_subjects. Used by the homepage
// to surface curated rankings. No auth; upstream is public.
// ============================================================================

import { requireApiPassword } from '@/lib/site-password-guard';
import { type DoubanMediaType, searchDouban } from '@marstv/core';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
// Revalidate on the CDN but share across users — nothing in the response is
// user-specific.
export const revalidate = 600;

const VALID_TYPES = new Set<DoubanMediaType>(['movie', 'tv']);
const VALID_SORTS = new Set(['recommend', 'time', 'rank']);

function parseType(v: string | null): DoubanMediaType | null {
  if (v && VALID_TYPES.has(v as DoubanMediaType)) return v as DoubanMediaType;
  return null;
}

function parseInt0(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function GET(request: NextRequest) {
  const auth = requireApiPassword(request);
  if (auth) return auth;

  const { searchParams } = request.nextUrl;

  const type = parseType(searchParams.get('type'));
  if (!type) {
    return Response.json({ error: "query 'type' must be 'movie' or 'tv'" }, { status: 400 });
  }

  const tag = searchParams.get('tag')?.trim();
  if (!tag) {
    return Response.json({ error: "query 'tag' is required" }, { status: 400 });
  }

  const pageSize = Math.min(parseInt0(searchParams.get('pagesize'), 20), 50);
  const pageStart = parseInt0(searchParams.get('pagestart'), 0);
  const sortRaw = searchParams.get('sort') ?? 'recommend';
  const sort = VALID_SORTS.has(sortRaw) ? (sortRaw as 'recommend' | 'time' | 'rank') : 'recommend';

  try {
    const result = await searchDouban({ type, tag, pageSize, pageStart, sort, timeoutMs: 8000 });
    return Response.json(result, {
      headers: {
        'cache-control': 'public, max-age=600, stale-while-revalidate=3600',
        'cdn-cache-control': 'max-age=600, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  }
}
