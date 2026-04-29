// ============================================================================
// Redis-backed IStorage implementation.
// Takes an injected client that satisfies `IRedisLikeStorage` so @marstv/core
// stays platform-neutral — the actual Redis/Upstash client lives in the
// consuming app (web / desktop / mobile).
//
// Layout (one deployment = one user, no per-user key prefix):
//   {namespace}:history       → HASH  field = `${source}::${id}`  value = PlayRecord
//   {namespace}:favorites     → HASH  field = `${source}::${id}`  value = FavoriteRecord
//   {namespace}:subscriptions → HASH  field = `${source}::${id}`  value = SubscriptionRecord
//
// Values are stored as objects directly; Upstash auto-serializes on write and
// auto-parses on read, matching the pattern in source-health-redis.ts.
// ============================================================================

import {
  type FavoriteRecord,
  type IStorage,
  type PlayRecord,
  type SubscriptionRecord,
  makePlayRecordKey,
} from './types';

/**
 * Minimal hash-oriented Redis client surface. Identical to the IRedisLike in
 * source-health-redis.ts but kept local so the storage module stays decoupled.
 */
export interface IRedisLikeStorage {
  hget<T = unknown>(key: string, field: string): Promise<T | null>;
  hgetall<T = unknown>(key: string): Promise<Record<string, T> | null>;
  hset(key: string, values: Record<string, unknown>): Promise<number>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  del(...keys: string[]): Promise<number>;
}

export interface RedisStorageOptions {
  /** Namespace prefix, default `marstv`. */
  namespace?: string;
}

const MAX_HISTORY = 500;
const MAX_FAVORITES = 1000;
const MAX_SUBSCRIPTIONS = 500;

export function createRedisStorage(
  client: IRedisLikeStorage,
  options: RedisStorageOptions = {},
): IStorage {
  const namespace = options.namespace ?? 'marstv';
  const historyKey = `${namespace}:history`;
  const favoritesKey = `${namespace}:favorites`;
  const subscriptionsKey = `${namespace}:subscriptions`;

  // --- Play records ---

  async function listPlayRecords(): Promise<PlayRecord[]> {
    const all = await client.hgetall<PlayRecord>(historyKey);
    if (!all) return [];
    return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function getPlayRecord(source: string, id: string): Promise<PlayRecord | null> {
    return (await client.hget<PlayRecord>(historyKey, makePlayRecordKey(source, id))) ?? null;
  }

  async function putPlayRecord(record: PlayRecord): Promise<void> {
    await client.hset(historyKey, { [makePlayRecordKey(record.source, record.id)]: record });
    await trimHash<PlayRecord>(
      client,
      historyKey,
      MAX_HISTORY,
      (a, b) => a.updatedAt - b.updatedAt,
    );
  }

  async function removePlayRecord(source: string, id: string): Promise<void> {
    await client.hdel(historyKey, makePlayRecordKey(source, id));
  }

  async function clearPlayRecords(): Promise<void> {
    await client.del(historyKey);
  }

  // --- Favorites ---

  async function listFavorites(): Promise<FavoriteRecord[]> {
    const all = await client.hgetall<FavoriteRecord>(favoritesKey);
    if (!all) return [];
    return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function hasFavorite(source: string, id: string): Promise<boolean> {
    const rec = await client.hget(favoritesKey, makePlayRecordKey(source, id));
    return rec !== null;
  }

  async function addFavorite(record: FavoriteRecord): Promise<void> {
    await client.hset(favoritesKey, { [makePlayRecordKey(record.source, record.id)]: record });
    await trimHash<FavoriteRecord>(
      client,
      favoritesKey,
      MAX_FAVORITES,
      (a, b) => a.updatedAt - b.updatedAt,
    );
  }

  async function removeFavorite(source: string, id: string): Promise<void> {
    await client.hdel(favoritesKey, makePlayRecordKey(source, id));
  }

  async function clearFavorites(): Promise<void> {
    await client.del(favoritesKey);
  }

  // --- Subscriptions ---

  async function listSubscriptions(): Promise<SubscriptionRecord[]> {
    const all = await client.hgetall<SubscriptionRecord>(subscriptionsKey);
    if (!all) return [];
    return Object.values(all).sort((a, b) => {
      const aNew = a.latestEpisodeCount > a.knownEpisodeCount ? 1 : 0;
      const bNew = b.latestEpisodeCount > b.knownEpisodeCount ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      return b.subscribedAt - a.subscribedAt;
    });
  }

  async function hasSubscription(source: string, id: string): Promise<boolean> {
    const rec = await client.hget(subscriptionsKey, makePlayRecordKey(source, id));
    return rec !== null;
  }

  async function getSubscription(source: string, id: string): Promise<SubscriptionRecord | null> {
    return (
      (await client.hget<SubscriptionRecord>(subscriptionsKey, makePlayRecordKey(source, id))) ??
      null
    );
  }

  async function putSubscription(record: SubscriptionRecord): Promise<void> {
    await client.hset(subscriptionsKey, { [makePlayRecordKey(record.source, record.id)]: record });
    await trimHash<SubscriptionRecord>(
      client,
      subscriptionsKey,
      MAX_SUBSCRIPTIONS,
      (a, b) => a.subscribedAt - b.subscribedAt,
    );
  }

  async function removeSubscription(source: string, id: string): Promise<void> {
    await client.hdel(subscriptionsKey, makePlayRecordKey(source, id));
  }

  async function updateSubscriptionChecks(
    updates: Array<{ source: string; id: string; latestEpisodeCount: number }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    const all = await client.hgetall<SubscriptionRecord>(subscriptionsKey);
    if (!all) return;
    const byKey = new Map(updates.map((u) => [makePlayRecordKey(u.source, u.id), u]));
    const now = Date.now();
    const patch: Record<string, SubscriptionRecord> = {};
    for (const [key, r] of Object.entries(all)) {
      const u = byKey.get(key);
      // silently skip ids user unsubscribed from mid-check
      if (!u) continue;
      // skip when count unchanged and lastCheckedAt is fresh (<1s ago)
      if (u.latestEpisodeCount === r.latestEpisodeCount && now - r.lastCheckedAt < 1000) {
        continue;
      }
      patch[key] = { ...r, latestEpisodeCount: u.latestEpisodeCount, lastCheckedAt: now };
    }
    if (Object.keys(patch).length > 0) {
      await client.hset(subscriptionsKey, patch);
    }
  }

  async function acknowledgeSubscription(source: string, id: string): Promise<void> {
    const key = makePlayRecordKey(source, id);
    const existing = await client.hget<SubscriptionRecord>(subscriptionsKey, key);
    if (!existing) return;
    if (existing.knownEpisodeCount >= existing.latestEpisodeCount) return;
    await client.hset(subscriptionsKey, {
      [key]: { ...existing, knownEpisodeCount: existing.latestEpisodeCount },
    });
  }

  async function clearSubscriptions(): Promise<void> {
    await client.del(subscriptionsKey);
  }

  return {
    listPlayRecords,
    getPlayRecord,
    putPlayRecord,
    removePlayRecord,
    clearPlayRecords,

    listFavorites,
    hasFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,

    listSubscriptions,
    hasSubscription,
    getSubscription,
    putSubscription,
    removeSubscription,
    updateSubscriptionChecks,
    acknowledgeSubscription,
    clearSubscriptions,
  };
}

/**
 * Read-modify-write trim: if hash exceeds max, delete the oldest entries.
 * Not atomic — we accept the same race tolerance as source-health-redis.
 */
async function trimHash<T>(
  client: IRedisLikeStorage,
  hashKey: string,
  max: number,
  cmp: (a: T, b: T) => number,
): Promise<void> {
  const all = await client.hgetall<T>(hashKey);
  if (!all) return;
  const entries = Object.entries(all);
  if (entries.length <= max) return;
  entries.sort((a, b) => cmp(a[1], b[1]));
  const toDelete = entries.slice(0, entries.length - max).map((e) => e[0]);
  if (toDelete.length > 0) {
    await client.hdel(hashKey, ...toDelete);
  }
}
