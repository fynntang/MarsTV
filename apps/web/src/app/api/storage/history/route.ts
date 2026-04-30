// ============================================================================
// POST /api/storage/history  — play record mutations
// GET  /api/storage/history  — list records (DESC by updatedAt)
//
// Gated: only responds when cloud storage is enabled (SITE_PASSWORD +
// UPSTASH_*). When disabled, returns 501 so the client can fall back to
// local LocalStorageBackend.
//
// This route is further protected by the page/API site-password guards.
// Unauthenticated requests never reach the storage backend.
// ============================================================================

import { requireApiPassword } from '@/lib/site-password-guard';
import { getServerStorage } from '@/lib/storage';
import type { PlayRecord } from '@marstv/core';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Action =
  | { action: 'put'; record: PlayRecord }
  | { action: 'remove'; source: string; id: string }
  | { action: 'clear' };

export async function GET(request: NextRequest) {
  const auth = requireApiPassword(request);
  if (auth) return auth;

  const storage = getServerStorage();
  if (!storage) return notAvailable();
  const records = await storage.listPlayRecords();
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
    case 'put': {
      if (!isPlayRecord(body.record)) return jsonNoStore({ error: 'invalid record' }, 400);
      await storage.putPlayRecord(body.record);
      return jsonNoStore({ ok: true });
    }
    case 'remove': {
      if (typeof body.source !== 'string' || typeof body.id !== 'string') {
        return jsonNoStore({ error: 'source and id required' }, 400);
      }
      await storage.removePlayRecord(body.source, body.id);
      return jsonNoStore({ ok: true });
    }
    case 'clear': {
      await storage.clearPlayRecords();
      return jsonNoStore({ ok: true });
    }
    default:
      return jsonNoStore({ error: 'unknown action' }, 400);
  }
}

function isPlayRecord(v: unknown): v is PlayRecord {
  if (!v || typeof v !== 'object') return false;
  const r = v as PlayRecord;
  return (
    typeof r.source === 'string' &&
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    typeof r.lineIdx === 'number' &&
    typeof r.epIdx === 'number' &&
    typeof r.positionSec === 'number' &&
    typeof r.durationSec === 'number' &&
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
