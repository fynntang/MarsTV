// ============================================================================
// POST /api/subscriptions/check
// Body: { items: [{ source, id }, ...] } (capped at 50)
// Response: { results: [{ source, id, ok: true, episodeCount, lineName? } |
//                        { source, id, ok: false, error }] }
//
// Batched detail refetch for the client's subscription list. Server-side so
// we can reuse the configured CmsSource list (client has no idea which apis
// are valid) and apply per-source timeouts.
// ============================================================================

import { findSource } from '@/lib/sources';
import { getDetail } from '@marstv/core';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ITEMS = 50;
const PER_ITEM_TIMEOUT_MS = 6000;

interface CheckItem {
  source: string;
  id: string;
}

interface CheckResult {
  source: string;
  id: string;
  ok: boolean;
  episodeCount?: number;
  lineName?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid json body' }, { status: 400 });
  }

  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items)) {
    return Response.json({ error: 'items must be an array' }, { status: 400 });
  }

  const normalized: CheckItem[] = [];
  for (const it of items) {
    const source = typeof (it as CheckItem)?.source === 'string' ? (it as CheckItem).source : '';
    const id = typeof (it as CheckItem)?.id === 'string' ? (it as CheckItem).id : '';
    if (source && id) normalized.push({ source, id });
    if (normalized.length >= MAX_ITEMS) break;
  }

  const results = await Promise.all(normalized.map(checkOne));
  return Response.json(
    { results },
    {
      // Short private cache: subscription check runs on every home-page load,
      // and back-to-back loads shouldn't hammer CMS. Private because responses
      // are per-user (derived from client's subscription list).
      headers: { 'cache-control': 'private, max-age=60' },
    },
  );
}

async function checkOne(item: CheckItem): Promise<CheckResult> {
  const source = findSource(item.source);
  if (!source) {
    return { source: item.source, id: item.id, ok: false, error: 'source not configured' };
  }
  try {
    const detail = await getDetail(source, item.id, { timeoutMs: PER_ITEM_TIMEOUT_MS });
    if (!detail) {
      return { source: item.source, id: item.id, ok: false, error: 'not found' };
    }
    let maxCount = 0;
    let maxLineName: string | undefined;
    for (const line of detail.lines) {
      if (line.episodes.length > maxCount) {
        maxCount = line.episodes.length;
        maxLineName = line.name;
      }
    }
    return {
      source: item.source,
      id: item.id,
      ok: true,
      episodeCount: maxCount,
      lineName: maxLineName,
    };
  } catch (err) {
    return {
      source: item.source,
      id: item.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
