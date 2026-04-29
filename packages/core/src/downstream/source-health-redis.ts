// ============================================================================
// Redis-backed source health store.
// The implementation takes an injected client that satisfies `IRedisLike` so
// @marstv/core stays platform-neutral — @upstash/redis (or any other Redis
// client exposing the same hash surface) only needs to live in the consuming
// app.
// ============================================================================

import type { ISourceHealthStore, SourceHealthRecord } from './source-health';

/**
 * Minimal hash-oriented subset of the Upstash Redis client surface. Any
 * implementation that auto-serializes objects on write and auto-parses on
 * read (Upstash's default behavior) drops in with no adapter.
 */
export interface IRedisLike {
  hget<T = unknown>(key: string, field: string): Promise<T | null>;
  hgetall<T = unknown>(key: string): Promise<Record<string, T> | null>;
  hset(key: string, values: Record<string, unknown>): Promise<number>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  del(...keys: string[]): Promise<number>;
}

export interface RedisHealthStoreOptions {
  /** Namespace prefix for the hash key, default `marstv`. */
  namespace?: string;
}

export function createRedisSourceHealthStore(
  client: IRedisLike,
  options: RedisHealthStoreOptions = {},
): ISourceHealthStore {
  const namespace = options.namespace ?? 'marstv';
  const hashKey = `${namespace}:source-health`;

  function blankRecord(sourceKey: string): SourceHealthRecord {
    return {
      sourceKey,
      okCount: 0,
      failCount: 0,
      consecutiveFails: 0,
      lastOkAt: null,
      lastFailAt: null,
      avgLatencyMs: 0,
      lastProbedAt: null,
    };
  }

  async function readOrInit(sourceKey: string): Promise<SourceHealthRecord> {
    const rec = await client.hget<SourceHealthRecord>(hashKey, sourceKey);
    return rec ?? blankRecord(sourceKey);
  }

  return {
    async get(sourceKey) {
      return (await client.hget<SourceHealthRecord>(hashKey, sourceKey)) ?? null;
    },

    async list() {
      const all = await client.hgetall<SourceHealthRecord>(hashKey);
      if (!all) return [];
      return Object.values(all);
    },

    // Read-modify-write is not atomic against concurrent recordOk/Fail. Health
    // scoring tolerates an occasional lost count — we accept the race instead
    // of adding WATCH/MULTI complexity for marginal accuracy gains.
    async recordOk(sourceKey, latencyMs) {
      const rec = await readOrInit(sourceKey);
      rec.okCount += 1;
      rec.consecutiveFails = 0;
      const now = Date.now();
      rec.lastOkAt = now;
      rec.lastProbedAt = now;
      if (rec.avgLatencyMs === 0) {
        rec.avgLatencyMs = latencyMs;
      } else {
        rec.avgLatencyMs = 0.8 * rec.avgLatencyMs + 0.2 * latencyMs;
      }
      await client.hset(hashKey, { [sourceKey]: rec });
    },

    async recordFail(sourceKey, error) {
      const rec = await readOrInit(sourceKey);
      rec.failCount += 1;
      rec.consecutiveFails += 1;
      const now = Date.now();
      rec.lastFailAt = now;
      rec.lastError = error;
      rec.lastProbedAt = now;
      await client.hset(hashKey, { [sourceKey]: rec });
    },

    async clear(sourceKey) {
      if (sourceKey) {
        await client.hdel(hashKey, sourceKey);
      } else {
        await client.del(hashKey);
      }
    },
  };
}
