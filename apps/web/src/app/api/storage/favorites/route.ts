// ============================================================================
// POST /api/storage/favorites  — favorite mutations
// GET  /api/storage/favorites  — list favorites (DESC by updatedAt)
//
// Gated on cloud storage (SITE_PASSWORD + UPSTASH_*); 501 when disabled.
// ============================================================================

import { requireApiPassword } from '@/lib/site-password-guard';
import { getServerStorage } from '@/lib/storage';
import type { FavoriteRecord } from '@marstv/core';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Action =
  | { action: 'add'; record: FavoriteRecord }
  | { action: 'remove'; source: string; id: string }
  | { action: 'clear' };

export async function GET(request: NextRequest) {
  const auth = requireApiPassword(request);
  if (auth) return auth;

  const storage = getServerStorage();
  if (!storage) return notAvailable();
  const records = await storage.listFavorites();
  return jsonNoStore({ records });
}

export async function POST(request: NextRequest) {
  const auth = requireApiPassword(request);
  if (auth) return auth;

  const storage = getServerStorage();
  if (!storage) return notAvailable();

  let body: Action;
  try {
    body = (await request.json()) as Action;
  } catch {
    return jsonNoStore({ error: 'invalid json' }, 400);
  }

  switch (body.action) {
    case 'add': {
      if (!isFavoriteRecord(body.record)) return jsonNoStore({ error: 'invalid record' }, 400);
      await storage.addFavorite(body.record);
      return jsonNoStore({ ok: true });
    }
    case 'remove': {
      if (typeof body.source !== 'string' || typeof body.id !== 'string') {
        return jsonNoStore({ error: 'source and id required' }, 400);
      }
      await storage.removeFavorite(body.source, body.id);
      return jsonNoStore({ ok: true });
    }
    case 'clear': {
      await storage.clearFavorites();
      return jsonNoStore({ ok: true });
    }
    default:
      return jsonNoStore({ error: 'unknown action' }, 400);
  }
}

function isFavoriteRecord(v: unknown): v is FavoriteRecord {
  if (!v || typeof v !== 'object') return false;
  const r = v as FavoriteRecord;
  return (
    typeof r.source === 'string' &&
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    typeof r.updatedAt === 'number'
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
