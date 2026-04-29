// ============================================================================
// Module-scoped source health store singleton for the web app.
//
// Dispatch: if UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are both set,
// the store is backed by a Redis hash and survives restarts. Otherwise we fall
// back to an in-memory Map — fine for local dev and single-instance deploys,
// lost on restart. Either way the callers see the same `ISourceHealthStore`
// interface.
// ============================================================================

import {
  type ISourceHealthStore,
  createInMemoryHealthStore,
  createRedisSourceHealthStore,
} from '@marstv/core';
import { createUpstashClient } from './upstash-redis';

function build(): { store: ISourceHealthStore; backend: 'redis' | 'memory' } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const client = createUpstashClient({ url, token });
    return { store: createRedisSourceHealthStore(client), backend: 'redis' };
  }
  return { store: createInMemoryHealthStore(), backend: 'memory' };
}

const built = build();

export const sourceHealthStore: ISourceHealthStore = built.store;
export const sourceHealthBackend: 'redis' | 'memory' = built.backend;
