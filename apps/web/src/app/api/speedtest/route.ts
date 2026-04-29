// ============================================================================
// POST /api/speedtest
// Body: { lines: Array<{ source: string; line: string; url: string }> }
// Returns ranked SpeedTestResult[] (highest score first).
//
// Probing happens server-side — doesn't reflect the user's actual network,
// but gives a stable relative ranking across lines. Each target URL is
// SSRF-checked before we fetch it. The endpoint is pure passthrough: the
// caller already knows the upstream URLs (we handed them out via /api/detail).
// ============================================================================

import { assertSafeUrl } from '@/lib/ssrf';
import { rankLines } from '@marstv/core';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  lines?: Array<{ source?: string; line?: string; url?: string }>;
  timeoutMs?: number;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'invalid json body' }, { status: 400 });
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return Response.json({ error: 'lines must be a non-empty array' }, { status: 400 });
  }
  if (body.lines.length > 16) {
    return Response.json({ error: 'too many lines (max 16)' }, { status: 400 });
  }

  const inputs: Array<{ source: string; line: string; url: string }> = [];
  for (const l of body.lines) {
    if (
      !l ||
      typeof l.url !== 'string' ||
      typeof l.source !== 'string' ||
      typeof l.line !== 'string'
    ) {
      return Response.json({ error: 'each line needs source/line/url strings' }, { status: 400 });
    }
    try {
      assertSafeUrl(new URL(l.url));
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'invalid url' },
        { status: 400 },
      );
    }
    inputs.push({ source: l.source, line: l.line, url: l.url });
  }

  const timeoutMs =
    typeof body.timeoutMs === 'number' && body.timeoutMs > 0 && body.timeoutMs <= 15000
      ? body.timeoutMs
      : 6000;

  const results = await rankLines(inputs, { timeoutMs, signal: request.signal });
  return Response.json({ results });
}
