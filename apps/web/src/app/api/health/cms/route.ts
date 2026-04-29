// ============================================================================
// GET  /api/health/cms  →  current health records for all configured sources
// POST /api/health/cms  →  proactive probe (requires x-probe-token header)
//
// GET is always open; POST requires HEALTH_PROBE_TOKEN env var + matching
// x-probe-token header. If HEALTH_PROBE_TOKEN is unset, POST returns 503.
// ============================================================================

import { sourceHealthStore } from '@/lib/source-health-store';
import { loadSources } from '@/lib/sources';
import { type SourceHealthRecord, searchSource } from '@marstv/core';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lightweight probe keyword — short enough to not hammer CMS, long enough to
// trigger a real search path.
const PROBE_KEYWORD = '电影';
const PROBE_TIMEOUT_MS = 10_000;

export async function GET(_request: NextRequest) {
  const sources = loadSources();
  const records = await sourceHealthStore.list();

  // Build a joined view: every configured source + optional health record.
  const results = sources.map((s) => {
    const r = records.find((rec) => rec.sourceKey === s.key);
    return r ? formatRecord(r) : { sourceKey: s.key, name: s.name, status: 'unknown' };
  });

  return Response.json(
    { sources: results },
    {
      headers: { 'cache-control': 'no-store' },
    },
  );
}

export async function POST(request: NextRequest) {
  const probeToken = process.env.HEALTH_PROBE_TOKEN;
  if (!probeToken) {
    return Response.json(
      { error: 'probe disabled: HEALTH_PROBE_TOKEN not configured' },
      { status: 503 },
    );
  }

  const token = request.headers.get('x-probe-token');
  if (!token || token !== probeToken) {
    return Response.json(
      { error: 'unauthorized: invalid or missing x-probe-token' },
      { status: 401 },
    );
  }

  const sources = loadSources().filter((s) => s.enabled !== false);

  const results: Array<{
    sourceKey: string;
    name: string;
    ok: boolean;
    tookMs: number;
    itemCount: number;
    error?: string;
  }> = [];

  for (const source of sources) {
    const start = Date.now();
    try {
      const r = await searchSource(source, PROBE_KEYWORD, 1, { timeoutMs: PROBE_TIMEOUT_MS });
      const tookMs = Date.now() - start;
      await sourceHealthStore.recordOk(source.key, tookMs);
      results.push({
        sourceKey: source.key,
        name: source.name,
        ok: true,
        tookMs,
        itemCount: r.items.length,
      });
    } catch (err) {
      const tookMs = Date.now() - start;
      await sourceHealthStore.recordFail(
        source.key,
        err instanceof Error ? err.message : String(err),
      );
      results.push({
        sourceKey: source.key,
        name: source.name,
        ok: false,
        tookMs,
        itemCount: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return Response.json(
    {
      summary: { total: results.length, ok: okCount, failed: results.length - okCount },
      results,
    },
    {
      headers: { 'cache-control': 'no-store' },
    },
  );
}

function formatRecord(r: SourceHealthRecord) {
  return {
    sourceKey: r.sourceKey,
    okCount: r.okCount,
    failCount: r.failCount,
    consecutiveFails: r.consecutiveFails,
    lastOkAt: r.lastOkAt,
    lastFailAt: r.lastFailAt,
    lastError: r.lastError,
    avgLatencyMs: r.avgLatencyMs,
    lastProbedAt: r.lastProbedAt,
  };
}
