// ============================================================================
// LocalStorage-backed IStorage implementation. Browser-only at runtime, but
// safe to import in Node/RN — the window check is lazy, per call.
//
// Layout:
//   marstv:history   → JSON array of PlayRecord
//   marstv:favorites → JSON array of FavoriteRecord
//
// One array per namespace is simpler than key-per-entry and, at the volumes
// we expect for a personal watch history (hundreds of entries), plenty fast.
// ============================================================================

import {
  type FavoriteRecord,
  type IStorage,
  type PlayRecord,
  type SubscriptionRecord,
  makePlayRecordKey,
} from './types';

const NS_HISTORY = 'marstv:history';
const NS_FAVORITES = 'marstv:favorites';
const NS_SUBSCRIPTIONS = 'marstv:subscriptions';

// Cap stored history to avoid unbounded growth. 500 is plenty for personal use;
// trimming is FIFO by updatedAt ascending.
const MAX_HISTORY = 500;
const MAX_FAVORITES = 1000;
const MAX_SUBSCRIPTIONS = 500;

function getStore(): Storage | null {
  if (typeof globalThis === 'undefined') return null;
  const g = globalThis as { localStorage?: Storage };
  return g.localStorage ?? null;
}

function readArray<T>(key: string): T[] {
  const store = getStore();
  if (!store) return [];
  try {
    const raw = store.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]): void {
  const store = getStore();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / private-mode — drop silently, caller can't meaningfully recover.
  }
}

export class LocalStorageBackend implements IStorage {
  async listPlayRecords(): Promise<PlayRecord[]> {
    const records = readArray<PlayRecord>(NS_HISTORY);
    return [...records].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getPlayRecord(source: string, id: string): Promise<PlayRecord | null> {
    const records = readArray<PlayRecord>(NS_HISTORY);
    const match = records.find(
      (r) => makePlayRecordKey(r.source, r.id) === makePlayRecordKey(source, id),
    );
    return match ?? null;
  }

  async putPlayRecord(record: PlayRecord): Promise<void> {
    const records = readArray<PlayRecord>(NS_HISTORY);
    const target = makePlayRecordKey(record.source, record.id);
    const rest = records.filter((r) => makePlayRecordKey(r.source, r.id) !== target);
    rest.push(record);
    // Trim oldest if over cap.
    if (rest.length > MAX_HISTORY) {
      rest.sort((a, b) => a.updatedAt - b.updatedAt);
      rest.splice(0, rest.length - MAX_HISTORY);
    }
    writeArray(NS_HISTORY, rest);
  }

  async removePlayRecord(source: string, id: string): Promise<void> {
    const records = readArray<PlayRecord>(NS_HISTORY);
    const target = makePlayRecordKey(source, id);
    writeArray(
      NS_HISTORY,
      records.filter((r) => makePlayRecordKey(r.source, r.id) !== target),
    );
  }

  async clearPlayRecords(): Promise<void> {
    writeArray(NS_HISTORY, []);
  }

  async listFavorites(): Promise<FavoriteRecord[]> {
    const records = readArray<FavoriteRecord>(NS_FAVORITES);
    return [...records].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async hasFavorite(source: string, id: string): Promise<boolean> {
    const records = readArray<FavoriteRecord>(NS_FAVORITES);
    const target = makePlayRecordKey(source, id);
    return records.some((r) => makePlayRecordKey(r.source, r.id) === target);
  }

  async addFavorite(record: FavoriteRecord): Promise<void> {
    const records = readArray<FavoriteRecord>(NS_FAVORITES);
    const target = makePlayRecordKey(record.source, record.id);
    const rest = records.filter((r) => makePlayRecordKey(r.source, r.id) !== target);
    rest.push(record);
    if (rest.length > MAX_FAVORITES) {
      rest.sort((a, b) => a.updatedAt - b.updatedAt);
      rest.splice(0, rest.length - MAX_FAVORITES);
    }
    writeArray(NS_FAVORITES, rest);
  }

  async removeFavorite(source: string, id: string): Promise<void> {
    const records = readArray<FavoriteRecord>(NS_FAVORITES);
    const target = makePlayRecordKey(source, id);
    writeArray(
      NS_FAVORITES,
      records.filter((r) => makePlayRecordKey(r.source, r.id) !== target),
    );
  }

  async clearFavorites(): Promise<void> {
    writeArray(NS_FAVORITES, []);
  }

  async listSubscriptions(): Promise<SubscriptionRecord[]> {
    const records = readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    // Sort: items with new episodes first, then by subscribedAt desc.
    return [...records].sort((a, b) => {
      const aNew = a.latestEpisodeCount > a.knownEpisodeCount ? 1 : 0;
      const bNew = b.latestEpisodeCount > b.knownEpisodeCount ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      return b.subscribedAt - a.subscribedAt;
    });
  }

  async hasSubscription(source: string, id: string): Promise<boolean> {
    const records = readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const target = makePlayRecordKey(source, id);
    return records.some((r) => makePlayRecordKey(r.source, r.id) === target);
  }

  async getSubscription(source: string, id: string): Promise<SubscriptionRecord | null> {
    const records = readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const target = makePlayRecordKey(source, id);
    return records.find((r) => makePlayRecordKey(r.source, r.id) === target) ?? null;
  }

  async putSubscription(record: SubscriptionRecord): Promise<void> {
    const records = readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const target = makePlayRecordKey(record.source, record.id);
    const rest = records.filter((r) => makePlayRecordKey(r.source, r.id) !== target);
    rest.push(record);
    if (rest.length > MAX_SUBSCRIPTIONS) {
      rest.sort((a, b) => a.subscribedAt - b.subscribedAt);
      rest.splice(0, rest.length - MAX_SUBSCRIPTIONS);
    }
    writeArray(NS_SUBSCRIPTIONS, rest);
  }

  async removeSubscription(source: string, id: string): Promise<void> {
    const records = readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const target = makePlayRecordKey(source, id);
    writeArray(
      NS_SUBSCRIPTIONS,
      records.filter((r) => makePlayRecordKey(r.source, r.id) !== target),
    );
  }

  async updateSubscriptionChecks(
    updates: Array<{ source: string; id: string; latestEpisodeCount: number }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    const records = readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const byKey = new Map(updates.map((u) => [makePlayRecordKey(u.source, u.id), u]));
    const now = Date.now();
    let changed = false;
    const next = records.map((r) => {
      const u = byKey.get(makePlayRecordKey(r.source, r.id));
      if (!u) return r;
      if (
        u.latestEpisodeCount === r.latestEpisodeCount &&
        // Still bump lastCheckedAt even when count didn't change.
        now - r.lastCheckedAt < 1000
      ) {
        return r;
      }
      changed = true;
      return { ...r, latestEpisodeCount: u.latestEpisodeCount, lastCheckedAt: now };
    });
    if (changed) writeArray(NS_SUBSCRIPTIONS, next);
  }

  async acknowledgeSubscription(source: string, id: string): Promise<void> {
    const records = readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const target = makePlayRecordKey(source, id);
    let changed = false;
    const next = records.map((r) => {
      if (makePlayRecordKey(r.source, r.id) !== target) return r;
      if (r.knownEpisodeCount >= r.latestEpisodeCount) return r;
      changed = true;
      return { ...r, knownEpisodeCount: r.latestEpisodeCount };
    });
    if (changed) writeArray(NS_SUBSCRIPTIONS, next);
  }

  async clearSubscriptions(): Promise<void> {
    writeArray(NS_SUBSCRIPTIONS, []);
  }
}

// Singleton for convenience in UI code.
export const localStorageBackend = new LocalStorageBackend();
