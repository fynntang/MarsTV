// ============================================================================
// GET /api/detail?source=<key>&id=<vod_id>
// Returns VideoDetail with play lines/episodes.
// ============================================================================

import { requireApiPassword } from '@/lib/site-password-guard';
import { findSource } from '@/lib/sources';
import { getDetail } from '@marstv/core';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiPassword(request);
  if (auth) return auth;

  const { searchParams } = request.nextUrl;
  const sourceKey = searchParams.get('source')?.trim();
  const id = searchParams.get('id')?.trim();

  if (!sourceKey || !id) {
    return Response.json(
      { error: 'missing required query parameters: source, id' },
      { status: 400 },
    );
  }

  const source = findSource(sourceKey);
  if (!source) {
    return Response.json({ error: `source not found: ${sourceKey}` }, { status: 404 });
  }

  try {
    const detail = await getDetail(source, id, { timeoutMs: 8000 });
    if (!detail) {
      return Response.json({ error: 'video not found' }, { status: 404 });
    }
    return Response.json(detail, {
      headers: {
        'cache-control': 'private, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
