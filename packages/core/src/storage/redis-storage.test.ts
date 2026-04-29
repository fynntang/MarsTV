import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type IRedisLikeStorage, createRedisStorage } from './redis-storage';
import type { FavoriteRecord, PlayRecord, SubscriptionRecord } from './types';

// In-memory fake mirroring Upstash's auto-JSON behavior: values round-trip
// through JSON.stringify/parse, matching what we'd see with real clients.
function makeFakeRedis(): IRedisLikeStorage & { _hashes: Map<string, Map<string, unknown>> } {
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

function makePlay(id: string, updatedAt: number, overrides: Partial<PlayRecord> = {}): PlayRecord {
  return {
    source: 'cms1',
    id,
    title: `title-${id}`,
    lineIdx: 0,
    epIdx: 0,
    positionSec: 10,
    durationSec: 100,
    updatedAt,
    ...overrides,
  };
}

function makeFav(
  id: string,
  updatedAt: number,
  overrides: Partial<FavoriteRecord> = {},
): FavoriteRecord {
  return { source: 'cms1', id, title: `fav-${id}`, updatedAt, ...overrides };
}

function makeSub(
  id: string,
  known: number,
  latest: number,
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord {
  return {
    source: 'cms1',
    id,
    title: `sub-${id}`,
    lineIdx: 0,
    knownEpisodeCount: known,
    latestEpisodeCount: latest,
    subscribedAt: 1000,
    lastCheckedAt: 1000,
    ...overrides,
  };
}

describe('createRedisStorage', () => {
  let fake: ReturnType<typeof makeFakeRedis>;

  beforeEach(() => {
    fake = makeFakeRedis();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- history ----

  it('listPlayRecords returns empty initially', async () => {
    const store = createRedisStorage(fake);
    expect(await store.listPlayRecords()).toEqual([]);
  });

  it('putPlayRecord → listPlayRecords round-trips all fields', async () => {
    const store = createRedisStorage(fake);
    const rec: PlayRecord = {
      source: 'cms1',
      sourceName: 'Test Source',
      id: 'vid1',
      title: 'Test Title',
      poster: 'https://img.example/1.jpg',
      lineIdx: 2,
      lineName: 'Line 2',
      epIdx: 5,
      positionSec: 123.5,
      durationSec: 3600,
      updatedAt: 1710000000000,
    };
    await store.putPlayRecord(rec);
    const list = await store.listPlayRecords();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(rec);
  });

  it('getPlayRecord returns null for missing, object for existing', async () => {
    const store = createRedisStorage(fake);
    expect(await store.getPlayRecord('cms1', 'x')).toBeNull();
    await store.putPlayRecord(makePlay('x', 1000));
    const got = await store.getPlayRecord('cms1', 'x');
    expect(got).not.toBeNull();
    expect(got?.id).toBe('x');
  });

  it('listPlayRecords sorted by updatedAt DESC', async () => {
    const store = createRedisStorage(fake);
    await store.putPlayRecord(makePlay('a', 1000));
    await store.putPlayRecord(makePlay('b', 3000));
    await store.putPlayRecord(makePlay('c', 2000));
    const list = await store.listPlayRecords();
    expect(list.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('removePlayRecord deletes only the target', async () => {
    const store = createRedisStorage(fake);
    await store.putPlayRecord(makePlay('a', 1000));
    await store.putPlayRecord(makePlay('b', 2000));
    await store.removePlayRecord('cms1', 'a');
    const list = await store.listPlayRecords();
    expect(list.map((r) => r.id)).toEqual(['b']);
  });

  it('clearPlayRecords removes the entire hash key', async () => {
    const store = createRedisStorage(fake);
    await store.putPlayRecord(makePlay('a', 1000));
    await store.putPlayRecord(makePlay('b', 2000));
    await store.clearPlayRecords();
    expect(await store.listPlayRecords()).toEqual([]);
    expect(fake._hashes.has('marstv:history')).toBe(false);
  });

  // ---- favorites ----

  it('listFavorites returns empty initially', async () => {
    const store = createRedisStorage(fake);
    expect(await store.listFavorites()).toEqual([]);
  });

  it('addFavorite → listFavorites round-trips all fields', async () => {
    const store = createRedisStorage(fake);
    const fav: FavoriteRecord = {
      source: 'cms2',
      sourceName: 'Fav Source',
      id: 'fav1',
      title: 'Fav Title',
      poster: 'https://img.example/fav.jpg',
      updatedAt: 1710000000000,
    };
    await store.addFavorite(fav);
    const list = await store.listFavorites();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(fav);
  });

  it('hasFavorite returns accurate boolean', async () => {
    const store = createRedisStorage(fake);
    expect(await store.hasFavorite('cms1', 'x')).toBe(false);
    await store.addFavorite(makeFav('x', 1000));
    expect(await store.hasFavorite('cms1', 'x')).toBe(true);
    await store.removeFavorite('cms1', 'x');
    expect(await store.hasFavorite('cms1', 'x')).toBe(false);
  });

  it('listFavorites sorted by updatedAt DESC', async () => {
    const store = createRedisStorage(fake);
    await store.addFavorite(makeFav('a', 1000));
    await store.addFavorite(makeFav('b', 3000));
    await store.addFavorite(makeFav('c', 2000));
    const list = await store.listFavorites();
    expect(list.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('addFavorite upserts by (source,id) — no duplicates', async () => {
    const store = createRedisStorage(fake);
    await store.addFavorite(makeFav('x', 1000));
    await store.addFavorite(makeFav('x', 2000));
    const list = await store.listFavorites();
    expect(list).toHaveLength(1);
    expect(list[0]?.updatedAt).toBe(2000);
  });

  it('removeFavorite deletes only the target', async () => {
    const store = createRedisStorage(fake);
    await store.addFavorite(makeFav('a', 1000));
    await store.addFavorite(makeFav('b', 2000));
    await store.removeFavorite('cms1', 'a');
    const list = await store.listFavorites();
    expect(list.map((r) => r.id)).toEqual(['b']);
  });

  it('clearFavorites removes the entire hash key', async () => {
    const store = createRedisStorage(fake);
    await store.addFavorite(makeFav('a', 1000));
    await store.addFavorite(makeFav('b', 2000));
    await store.clearFavorites();
    expect(await store.listFavorites()).toEqual([]);
    expect(fake._hashes.has('marstv:favorites')).toBe(false);
  });

  // ---- subscriptions ----

  it('listSubscriptions returns empty initially', async () => {
    const store = createRedisStorage(fake);
    expect(await store.listSubscriptions()).toEqual([]);
  });

  it('putSubscription → getSubscription round-trips all fields', async () => {
    const store = createRedisStorage(fake);
    const sub: SubscriptionRecord = {
      source: 'cms3',
      sourceName: 'Sub Source',
      id: 'sub1',
      title: 'Sub Title',
      poster: 'https://img.example/sub.jpg',
      lineIdx: 1,
      lineName: 'Line 1',
      knownEpisodeCount: 10,
      latestEpisodeCount: 12,
      subscribedAt: 1710000000000,
      lastCheckedAt: 1710000001000,
    };
    await store.putSubscription(sub);
    const got = await store.getSubscription('cms3', 'sub1');
    expect(got).toEqual(sub);
  });

  it('getSubscription returns null for missing', async () => {
    const store = createRedisStorage(fake);
    expect(await store.getSubscription('cms1', 'ghost')).toBeNull();
  });

  it('hasSubscription returns accurate boolean', async () => {
    const store = createRedisStorage(fake);
    expect(await store.hasSubscription('cms1', 'x')).toBe(false);
    await store.putSubscription(makeSub('x', 10, 10));
    expect(await store.hasSubscription('cms1', 'x')).toBe(true);
    await store.removeSubscription('cms1', 'x');
    expect(await store.hasSubscription('cms1', 'x')).toBe(false);
  });

  it('listSubscriptions: has-new first, then subscribedAt DESC', async () => {
    const store = createRedisStorage(fake);
    // a: no new eps, older; b: has new eps, oldest; c: no new eps, newest
    await store.putSubscription(makeSub('a', 10, 10, { subscribedAt: 3000 }));
    await store.putSubscription(makeSub('b', 10, 12, { subscribedAt: 1000 }));
    await store.putSubscription(makeSub('c', 10, 10, { subscribedAt: 4000 }));
    const list = await store.listSubscriptions();
    expect(list.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('removeSubscription deletes only the target', async () => {
    const store = createRedisStorage(fake);
    await store.putSubscription(makeSub('a', 10, 10));
    await store.putSubscription(makeSub('b', 10, 10));
    await store.removeSubscription('cms1', 'a');
    const list = await store.listSubscriptions();
    expect(list.map((s) => s.id)).toEqual(['b']);
  });

  it('clearSubscriptions removes the entire hash key', async () => {
    const store = createRedisStorage(fake);
    await store.putSubscription(makeSub('a', 10, 10));
    await store.putSubscription(makeSub('b', 10, 11));
    await store.clearSubscriptions();
    expect(await store.listSubscriptions()).toEqual([]);
    expect(fake._hashes.has('marstv:subscriptions')).toBe(false);
  });

  // ---- updateSubscriptionChecks ----

  it('updateSubscriptionChecks merges latestEpisodeCount and lastCheckedAt', async () => {
    vi.setSystemTime(new Date('2026-04-29T10:00:00Z'));
    const store = createRedisStorage(fake);
    const old = new Date('2026-04-29T09:00:00Z').getTime();
    await store.putSubscription(makeSub('a', 10, 10, { lastCheckedAt: old }));
    await store.updateSubscriptionChecks([{ source: 'cms1', id: 'a', latestEpisodeCount: 12 }]);
    const sub = await store.getSubscription('cms1', 'a');
    expect(sub?.latestEpisodeCount).toBe(12);
    expect(sub?.knownEpisodeCount).toBe(10);
    expect(sub?.lastCheckedAt).toBe(Date.now());
  });

  it('updateSubscriptionChecks ignores unknown ids', async () => {
    const store = createRedisStorage(fake);
    await store.putSubscription(makeSub('a', 10, 10));
    await store.updateSubscriptionChecks([{ source: 'cms1', id: 'ghost', latestEpisodeCount: 99 }]);
    expect(await store.getSubscription('cms1', 'ghost')).toBeNull();
    const stillA = await store.getSubscription('cms1', 'a');
    expect(stillA?.latestEpisodeCount).toBe(10);
  });

  it('updateSubscriptionChecks no-ops on empty updates array', async () => {
    const store = createRedisStorage(fake);
    await store.putSubscription(makeSub('a', 10, 10));
    await store.updateSubscriptionChecks([]);
    const sub = await store.getSubscription('cms1', 'a');
    expect(sub?.latestEpisodeCount).toBe(10);
  });

  // ---- acknowledgeSubscription ----

  it('acknowledgeSubscription bumps knownEpisodeCount to match latestEpisodeCount', async () => {
    const store = createRedisStorage(fake);
    await store.putSubscription(makeSub('a', 10, 12));
    await store.acknowledgeSubscription('cms1', 'a');
    const sub = await store.getSubscription('cms1', 'a');
    expect(sub?.knownEpisodeCount).toBe(12);
  });

  it('acknowledgeSubscription is idempotent', async () => {
    const store = createRedisStorage(fake);
    await store.putSubscription(makeSub('a', 10, 12));
    await store.acknowledgeSubscription('cms1', 'a');
    // second call should not regress
    await store.acknowledgeSubscription('cms1', 'a');
    const sub = await store.getSubscription('cms1', 'a');
    expect(sub?.knownEpisodeCount).toBe(12);
  });

  it('acknowledgeSubscription no-ops when already caught up', async () => {
    const store = createRedisStorage(fake);
    await store.putSubscription(makeSub('a', 10, 10));
    await store.acknowledgeSubscription('cms1', 'a');
    const sub = await store.getSubscription('cms1', 'a');
    expect(sub?.knownEpisodeCount).toBe(10);
    expect(sub?.latestEpisodeCount).toBe(10);
  });

  it('acknowledgeSubscription no-ops for unknown id', async () => {
    const store = createRedisStorage(fake);
    await expect(store.acknowledgeSubscription('cms1', 'ghost')).resolves.toBeUndefined();
  });

  // ---- cross-cutting ----

  it('custom namespace isolates keys', async () => {
    const storeA = createRedisStorage(fake, { namespace: 'custom' });
    const storeB = createRedisStorage(fake, { namespace: 'marstv' });
    await storeA.putPlayRecord(makePlay('x', 1000));
    await storeB.putPlayRecord(makePlay('y', 2000));

    const listA = await storeA.listPlayRecords();
    const listB = await storeB.listPlayRecords();
    expect(listA).toHaveLength(1);
    expect(listA[0]?.id).toBe('x');
    expect(listB).toHaveLength(1);
    expect(listB[0]?.id).toBe('y');
  });

  it('trim to MAX_HISTORY: oldest records evicted', async () => {
    const MAX = 500;
    const store = createRedisStorage(fake);
    // Write MAX+5 records with monotonic updatedAt.
    for (let i = 0; i < MAX + 5; i++) {
      await store.putPlayRecord(makePlay(`v${i}`, i * 1000));
    }
    const list = await store.listPlayRecords();
    expect(list).toHaveLength(MAX);
    // Oldest 5 records should be gone (v0 through v4).
    const ids = new Set(list.map((r) => r.id));
    expect(ids.has('v0')).toBe(false);
    expect(ids.has('v4')).toBe(false);
    expect(ids.has('v5')).toBe(true);
    expect(ids.has(`v${MAX + 4}`)).toBe(true);
  });

  it('records isolated by source with same id', async () => {
    const store = createRedisStorage(fake);
    await store.putPlayRecord(makePlay('shared', 1000, { source: 'cms1' }));
    await store.putPlayRecord(makePlay('shared', 2000, { source: 'cms2' }));
    const list = await store.listPlayRecords();
    expect(list).toHaveLength(2);
    await store.removePlayRecord('cms1', 'shared');
    const after = await store.listPlayRecords();
    expect(after).toHaveLength(1);
    expect(after[0]?.source).toBe('cms2');
  });
});
