import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageBackend } from './local';
import type { FavoriteRecord, PlayRecord, SubscriptionRecord } from './types';

// Minimal in-memory localStorage polyfill for Node. Mirrors just the surface
// LocalStorageBackend touches (getItem / setItem / removeItem / clear).
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

function installPolyfill(): MemoryStorage {
  const ls = new MemoryStorage();
  (globalThis as { localStorage?: Storage }).localStorage = ls as unknown as Storage;
  return ls;
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

function makeFav(id: string, updatedAt: number): FavoriteRecord {
  return { source: 'cms1', id, title: `fav-${id}`, updatedAt };
}

function makeSub(
  id: string,
  known: number,
  latest: number,
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord {
  const now = Date.now();
  return {
    source: 'cms1',
    id,
    title: `sub-${id}`,
    lineIdx: 0,
    knownEpisodeCount: known,
    latestEpisodeCount: latest,
    subscribedAt: now,
    lastCheckedAt: now,
    ...overrides,
  };
}

describe('LocalStorageBackend — play records', () => {
  let backend: LocalStorageBackend;
  beforeEach(() => {
    installPolyfill();
    backend = new LocalStorageBackend();
  });

  it('returns empty list when nothing stored', async () => {
    expect(await backend.listPlayRecords()).toEqual([]);
  });

  it('upsert by (source,id): putting same id twice replaces in place', async () => {
    await backend.putPlayRecord(makePlay('a', 1000));
    await backend.putPlayRecord(makePlay('a', 2000, { positionSec: 42 }));
    const records = await backend.listPlayRecords();
    expect(records).toHaveLength(1);
    expect(records[0]?.positionSec).toBe(42);
    expect(records[0]?.updatedAt).toBe(2000);
  });

  it('lists records sorted by updatedAt desc', async () => {
    await backend.putPlayRecord(makePlay('a', 1000));
    await backend.putPlayRecord(makePlay('b', 3000));
    await backend.putPlayRecord(makePlay('c', 2000));
    const records = await backend.listPlayRecords();
    expect(records.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('removePlayRecord deletes the matching entry only', async () => {
    await backend.putPlayRecord(makePlay('a', 1000));
    await backend.putPlayRecord(makePlay('b', 2000));
    await backend.removePlayRecord('cms1', 'a');
    const records = await backend.listPlayRecords();
    expect(records.map((r) => r.id)).toEqual(['b']);
  });

  it('clearPlayRecords wipes everything', async () => {
    await backend.putPlayRecord(makePlay('a', 1000));
    await backend.clearPlayRecords();
    expect(await backend.listPlayRecords()).toEqual([]);
  });

  it('isolates records across different sources with same id', async () => {
    await backend.putPlayRecord(makePlay('shared', 1000));
    await backend.putPlayRecord(makePlay('shared', 2000, { source: 'cms2' }));
    const records = await backend.listPlayRecords();
    expect(records).toHaveLength(2);
    await backend.removePlayRecord('cms1', 'shared');
    const after = await backend.listPlayRecords();
    expect(after).toHaveLength(1);
    expect(after[0]?.source).toBe('cms2');
  });
});

describe('LocalStorageBackend — favorites', () => {
  let backend: LocalStorageBackend;
  beforeEach(() => {
    installPolyfill();
    backend = new LocalStorageBackend();
  });

  it('hasFavorite flips true after add, false after remove', async () => {
    expect(await backend.hasFavorite('cms1', 'x')).toBe(false);
    await backend.addFavorite(makeFav('x', 1000));
    expect(await backend.hasFavorite('cms1', 'x')).toBe(true);
    await backend.removeFavorite('cms1', 'x');
    expect(await backend.hasFavorite('cms1', 'x')).toBe(false);
  });

  it('re-adding the same favorite upserts rather than duplicates', async () => {
    await backend.addFavorite(makeFav('x', 1000));
    await backend.addFavorite(makeFav('x', 2000));
    const favs = await backend.listFavorites();
    expect(favs).toHaveLength(1);
    expect(favs[0]?.updatedAt).toBe(2000);
  });
});

describe('LocalStorageBackend — subscriptions', () => {
  let backend: LocalStorageBackend;
  beforeEach(() => {
    installPolyfill();
    backend = new LocalStorageBackend();
  });

  it('lists new-episode subs first, then by subscribedAt desc', async () => {
    // a: no new eps; b: has new eps (subscribedAt older); c: no new eps (newer)
    await backend.putSubscription(makeSub('a', 10, 10, { subscribedAt: 3000 }));
    await backend.putSubscription(makeSub('b', 10, 12, { subscribedAt: 1000 }));
    await backend.putSubscription(makeSub('c', 10, 10, { subscribedAt: 4000 }));
    const subs = await backend.listSubscriptions();
    // b first (has new). Then c (newer subscribedAt), then a.
    expect(subs.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('updateSubscriptionChecks merges latest counts and bumps lastCheckedAt', async () => {
    const old = Date.now() - 10 * 60 * 1000;
    await backend.putSubscription(makeSub('a', 10, 10, { lastCheckedAt: old }));
    await backend.updateSubscriptionChecks([{ source: 'cms1', id: 'a', latestEpisodeCount: 12 }]);
    const sub = await backend.getSubscription('cms1', 'a');
    expect(sub?.latestEpisodeCount).toBe(12);
    expect(sub?.knownEpisodeCount).toBe(10);
    expect((sub?.lastCheckedAt ?? 0) > old).toBe(true);
  });

  it('updateSubscriptionChecks ignores unknown ids (user unsubscribed mid-flight)', async () => {
    await backend.putSubscription(makeSub('a', 10, 10));
    await backend.updateSubscriptionChecks([
      { source: 'cms1', id: 'ghost', latestEpisodeCount: 99 },
    ]);
    expect(await backend.getSubscription('cms1', 'ghost')).toBeNull();
    const stillA = await backend.getSubscription('cms1', 'a');
    expect(stillA?.latestEpisodeCount).toBe(10);
  });

  it('acknowledgeSubscription bumps known up to latest, and is idempotent', async () => {
    await backend.putSubscription(makeSub('a', 10, 12));
    await backend.acknowledgeSubscription('cms1', 'a');
    const after1 = await backend.getSubscription('cms1', 'a');
    expect(after1?.knownEpisodeCount).toBe(12);
    // Second call — same latest, should stay at 12 (no regression).
    await backend.acknowledgeSubscription('cms1', 'a');
    const after2 = await backend.getSubscription('cms1', 'a');
    expect(after2?.knownEpisodeCount).toBe(12);
  });

  it('acknowledgeSubscription is a no-op when already caught up', async () => {
    await backend.putSubscription(makeSub('a', 10, 10));
    await backend.acknowledgeSubscription('cms1', 'a');
    const sub = await backend.getSubscription('cms1', 'a');
    expect(sub?.knownEpisodeCount).toBe(10);
    expect(sub?.latestEpisodeCount).toBe(10);
  });

  it('removeSubscription clears hasSubscription lookup', async () => {
    await backend.putSubscription(makeSub('a', 10, 10));
    expect(await backend.hasSubscription('cms1', 'a')).toBe(true);
    await backend.removeSubscription('cms1', 'a');
    expect(await backend.hasSubscription('cms1', 'a')).toBe(false);
  });

  it('clearSubscriptions wipes everything', async () => {
    await backend.putSubscription(makeSub('a', 10, 10));
    await backend.putSubscription(makeSub('b', 10, 11));
    await backend.clearSubscriptions();
    expect(await backend.listSubscriptions()).toEqual([]);
  });
});

describe('LocalStorageBackend — resilience', () => {
  let backend: LocalStorageBackend;
  beforeEach(() => {
    installPolyfill();
    backend = new LocalStorageBackend();
  });

  it('survives garbage JSON in the namespace (returns empty list)', async () => {
    (globalThis as { localStorage: Storage }).localStorage.setItem('marstv:history', 'not-json');
    expect(await backend.listPlayRecords()).toEqual([]);
  });

  it('survives a non-array JSON value (returns empty list)', async () => {
    (globalThis as { localStorage: Storage }).localStorage.setItem(
      'marstv:favorites',
      '{"oops":true}',
    );
    expect(await backend.listFavorites()).toEqual([]);
  });

  it('returns empty arrays when localStorage is absent (SSR-safe)', async () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    const ssrBackend = new LocalStorageBackend();
    expect(await ssrBackend.listPlayRecords()).toEqual([]);
    expect(await ssrBackend.listFavorites()).toEqual([]);
    expect(await ssrBackend.listSubscriptions()).toEqual([]);
    // Write is a silent no-op rather than a throw.
    await expect(ssrBackend.putPlayRecord(makePlay('a', 1))).resolves.toBeUndefined();
  });
});
