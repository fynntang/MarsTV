import { describe, expect, it } from 'vitest';
import { scoreSource, shouldSkipSource } from './source-health';
import { type IRedisLike, createRedisSourceHealthStore } from './source-health-redis';

// In-memory fake mirroring Upstash's auto-JSON behavior: values round-trip
// through structured clone, matching what we'd see with real clients.
function makeFakeRedis(): IRedisLike & { _hashes: Map<string, Map<string, unknown>> } {
  const hashes = new Map<string, Map<string, unknown>>();

  function ensure(key: string): Map<string, unknown> {
    let h = hashes.get(key);
    if (!h) {
      h = new Map();
      hashes.set(key, h);
    }
    return h;
  }

  function roundtrip<T>(v: T): T {
    return JSON.parse(JSON.stringify(v)) as T;
  }

  return {
    _hashes: hashes,
    async hget<T = unknown>(key: string, field: string) {
      const h = hashes.get(key);
      if (!h || !h.has(field)) return null;
      return roundtrip(h.get(field)) as T;
    },
    async hgetall<T = unknown>(key: string) {
      const h = hashes.get(key);
      if (!h || h.size === 0) return null;
      const out: Record<string, T> = {};
      for (const [f, v] of h) out[f] = roundtrip(v) as T;
      return out;
    },
    async hset(key: string, values: Record<string, unknown>) {
      const h = ensure(key);
      let added = 0;
      for (const [f, v] of Object.entries(values)) {
        if (!h.has(f)) added += 1;
        h.set(f, roundtrip(v));
      }
      return added;
    },
    async hdel(key: string, ...fields: string[]) {
      const h = hashes.get(key);
      if (!h) return 0;
      let removed = 0;
      for (const f of fields) {
        if (h.delete(f)) removed += 1;
      }
      return removed;
    },
    async del(...keys: string[]) {
      let removed = 0;
      for (const k of keys) {
        if (hashes.delete(k)) removed += 1;
      }
      return removed;
    },
  };
}

describe('createRedisSourceHealthStore', () => {
  it('returns null for unknown source', async () => {
    const store = createRedisSourceHealthStore(makeFakeRedis());
    expect(await store.get('nope')).toBeNull();
  });

  it('list is empty initially', async () => {
    const store = createRedisSourceHealthStore(makeFakeRedis());
    expect(await store.list()).toEqual([]);
  });

  it('recordOk persists okCount and resets consecutiveFails', async () => {
    const store = createRedisSourceHealthStore(makeFakeRedis());
    await store.recordFail('a', 'x');
    await store.recordFail('a', 'y');
    await store.recordOk('a', 120);

    const rec = await store.get('a');
    expect(rec?.okCount).toBe(1);
    expect(rec?.failCount).toBe(2);
    expect(rec?.consecutiveFails).toBe(0);
    expect(rec?.avgLatencyMs).toBe(120);
    expect(rec?.lastOkAt).toBeGreaterThan(0);
  });

  it('recordFail accumulates consecutiveFails and keeps lastError', async () => {
    const store = createRedisSourceHealthStore(makeFakeRedis());
    await store.recordFail('a', 'timeout');
    await store.recordFail('a', 'refused');

    const rec = await store.get('a');
    expect(rec?.failCount).toBe(2);
    expect(rec?.consecutiveFails).toBe(2);
    expect(rec?.lastError).toBe('refused');
  });

  it('EMA smoothing applies across multiple successes', async () => {
    const store = createRedisSourceHealthStore(makeFakeRedis());
    await store.recordOk('a', 100);
    await store.recordOk('a', 200);
    const rec = await store.get('a');
    expect(rec?.avgLatencyMs).toBeCloseTo(120, 5);
  });

  it('clear(sourceKey) removes only that hash field', async () => {
    const fake = makeFakeRedis();
    const store = createRedisSourceHealthStore(fake);
    await store.recordOk('a', 100);
    await store.recordOk('b', 200);
    await store.clear('a');

    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.sourceKey).toBe('b');
  });

  it('clear() with no argument removes the entire hash key', async () => {
    const fake = makeFakeRedis();
    const store = createRedisSourceHealthStore(fake);
    await store.recordOk('a', 100);
    await store.recordOk('b', 200);
    await store.clear();
    expect(await store.list()).toEqual([]);
    expect(fake._hashes.has('marstv:source-health')).toBe(false);
  });

  it('respects a custom namespace', async () => {
    const fake = makeFakeRedis();
    const store = createRedisSourceHealthStore(fake, { namespace: 'custom' });
    await store.recordOk('a', 50);
    expect(fake._hashes.has('custom:source-health')).toBe(true);
    expect(fake._hashes.has('marstv:source-health')).toBe(false);
  });

  it('round-trips through scoreSource / shouldSkipSource unchanged', async () => {
    const store = createRedisSourceHealthStore(makeFakeRedis());
    for (let i = 0; i < 5; i++) {
      await store.recordFail('s', `fail ${i}`);
    }
    const rec = await store.get('s');
    expect(scoreSource(rec)).toBeLessThan(0.1);
    expect(shouldSkipSource(rec)).toBe(true);
  });
});
