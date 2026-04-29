// ============================================================================
// Server-side IStorage dispatcher for the web app.
//
// Cloud mode (Redis) activates ONLY when all three are set:
//   - SITE_PASSWORD              (deployment is effectively single-user)
//   - UPSTASH_REDIS_REST_URL
//   - UPSTASH_REDIS_REST_TOKEN
//
// SITE_PASSWORD is part of the gate because the single shared keyspace per
// deployment assumes one authenticated owner — without the password gate an
// open instance would let any visitor clobber the shared history/favorites.
//
// Otherwise cloud mode is OFF; server-side IStorage is unavailable and
// `/api/storage/*` routes respond 501. The client then falls back to the
// local LocalStorageBackend in the browser, which is the M1 behavior.
// ============================================================================

import { type IStorage, createRedisStorage } from '@marstv/core';
import { createUpstashClient } from './upstash-redis';

export function isCloudStorageEnabled(): boolean {
  return (
    !!process.env.SITE_PASSWORD &&
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

let _cached: IStorage | null = null;

export function getServerStorage(): IStorage | null {
  if (!isCloudStorageEnabled()) return null;
  if (_cached) return _cached;
  const client = createUpstashClient({
    url: process.env.UPSTASH_REDIS_REST_URL ?? '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  });
  _cached = createRedisStorage(client);
  return _cached;
}

/** Test hook — reset the cached singleton when env changes between cases. */
export function _resetServerStorageForTests(): void {
  _cached = null;
}
