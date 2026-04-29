// ============================================================================
// POST /api/storage/subscriptions  — subscription mutations
// GET  /api/storage/subscriptions  — list subscriptions (new-first, then
//                                     subscribedAt DESC)
//
// Gated on cloud storage (SITE_PASSWORD + UPSTASH_*); 501 when disabled.
// ============================================================================

import { getServerStorage } from '@/lib/storage';
import type { SubscriptionRecord } from '@marstv/core';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Action =
  | { action: 'put'; record: SubscriptionRecord }
  | { action: 'remove'; source: string; id: string }
  | { action: 'acknowledge'; source: string; id: string }
  | {
      action: 'updateChecks';
      updates: Array<{ source: string; id: string; latestEpisodeCount: number }>;
    }
  | { action: 'clear' };

export async function GET() {
  const storage = getServerStorage();
  if (!storage) return notAvailable();
  const records = await storage.listSubscriptions();
  return jsonNoStore({ records });
}

export async function POST(request: NextRequest) {
  const storage = getServerStorage();
  if (!storage) return notAvailable();

  let body: Action;
  try {
    body = (await request.json()) as Action;
  } catch {
    return jsonNoStore({ error: 'invalid json' }, 400);
  }

  switch (body.action) {
    case 'put': {
      if (!isSubscriptionRecord(body.record)) return jsonNoStore({ error: 'invalid record' }, 400);
      await storage.putSubscription(body.record);
      return jsonNoStore({ ok: true });
    }
    case 'remove': {
      if (typeof body.source !== 'string' || typeof body.id !== 'string') {
        return jsonNoStore({ error: 'source and id required' }, 400);
      }
      await storage.removeSubscription(body.source, body.id);
      return jsonNoStore({ ok: true });
    }
    case 'acknowledge': {
      if (typeof body.source !== 'string' || typeof body.id !== 'string') {
        return jsonNoStore({ error: 'source and id required' }, 400);
      }
      await storage.acknowledgeSubscription(body.source, body.id);
      return jsonNoStore({ ok: true });
    }
    case 'updateChecks': {
      if (!Array.isArray(body.updates)) return jsonNoStore({ error: 'updates required' }, 400);
      for (const u of body.updates) {
        if (
          typeof u.source !== 'string' ||
          typeof u.id !== 'string' ||
          typeof u.latestEpisodeCount !== 'number'
        ) {
          return jsonNoStore({ error: 'invalid update shape' }, 400);
        }
      }
      await storage.updateSubscriptionChecks(body.updates);
      return jsonNoStore({ ok: true });
    }
    case 'clear': {
      await storage.clearSubscriptions();
      return jsonNoStore({ ok: true });
    }
    default:
      return jsonNoStore({ error: 'unknown action' }, 400);
  }
}

function isSubscriptionRecord(v: unknown): v is SubscriptionRecord {
  if (!v || typeof v !== 'object') return false;
  const r = v as SubscriptionRecord;
  return (
    typeof r.source === 'string' &&
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    typeof r.lineIdx === 'number' &&
    typeof r.knownEpisodeCount === 'number' &&
    typeof r.latestEpisodeCount === 'number' &&
    typeof r.subscribedAt === 'number' &&
    typeof r.lastCheckedAt === 'number'
  );
}

function notAvailable() {
  return jsonNoStore({ error: 'cloud storage disabled; fall back to local' }, 501);
}

function jsonNoStore(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
