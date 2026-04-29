// ============================================================================
// GET /api/search?q=<keyword>&page=<n>&source=<key?>
// - Missing q → 400
// - source= filter → search only that source
// - Otherwise → aggregate across all enabled sources
// ============================================================================

import { sourceHealthStore } from '@/lib/source-health-store';
import { loadSources } from '@/lib/sources';
import { aggregateSearch } from '@marstv/core';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const keyword = searchParams.get('q')?.trim();
  const sourceKey = searchParams.get('source')?.trim() || undefined;
  const pageRaw = Number(searchParams.get('page') ?? '1');
  const maxPage = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 5) : 1;

  if (!keyword) {
    return Response.json({ error: 'missing required query parameter: q' }, { status: 400 });
  }

  const all = loadSources();
  if (all.length === 0) {
    return Response.json(
      {
        items: [],
        sourceStats: [],
        warning: 'No CMS sources configured. Set CMS_SOURCES_JSON env var.',
      },
      { status: 200 },
    );
  }

  const targetSources = sourceKey ? all.filter((s) => s.key === sourceKey) : all;
  if (targetSources.length === 0) {
    return Response.json({ error: `source not found: ${sourceKey}` }, { status: 404 });
  }

  try {
    const result = await aggregateSearch(targetSources, keyword, {
      perSourceTimeoutMs: 8000,
      maxPage,
      healthStore: sourceHealthStore,
    });
    return Response.json(result, {
      headers: {
        'cache-control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
