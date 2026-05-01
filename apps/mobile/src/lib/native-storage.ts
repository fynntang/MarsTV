import type { FavoriteRecord, IStorage, PlayRecord, SubscriptionRecord } from '@marstv/core';
import { makePlayRecordKey } from '@marstv/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NS_HISTORY = 'marstv:history';
const NS_FAVORITES = 'marstv:favorites';
const NS_SUBSCRIPTIONS = 'marstv:subscriptions';

async function _readArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function _writeArray<T>(key: string, value: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / storage error */
  }
}

export class NativeStorageBackend implements IStorage {
  async listPlayRecords(): Promise<PlayRecord[]> {
    const records = await _readArray<PlayRecord>(NS_HISTORY);
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getPlayRecord(source: string, id: string): Promise<PlayRecord | null> {
    const records = await _readArray<PlayRecord>(NS_HISTORY);
    const target = makePlayRecordKey(source, id);
    return records.find((r) => makePlayRecordKey(r.source, r.id) === target) ?? null;
  }

  async putPlayRecord(record: PlayRecord): Promise<void> {
    const records = await _readArray<PlayRecord>(NS_HISTORY);
    const target = makePlayRecordKey(record.source, record.id);
    const rest = records.filter((r) => makePlayRecordKey(r.source, r.id) !== target);
    rest.push(record);
    if (rest.length > 500) {
      rest.sort((a, b) => a.updatedAt - b.updatedAt);
      rest.splice(0, rest.length - 500);
    }
    await _writeArray(NS_HISTORY, rest);
  }

  async removePlayRecord(source: string, id: string): Promise<void> {
    const records = await _readArray<PlayRecord>(NS_HISTORY);
    const target = makePlayRecordKey(source, id);
    await _writeArray(
      NS_HISTORY,
      records.filter((r) => makePlayRecordKey(r.source, r.id) !== target),
    );
  }

  async clearPlayRecords(): Promise<void> {
    await _writeArray(NS_HISTORY, []);
  }

  async listFavorites(): Promise<FavoriteRecord[]> {
    const records = await _readArray<FavoriteRecord>(NS_FAVORITES);
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async hasFavorite(source: string, id: string): Promise<boolean> {
    const records = await _readArray<FavoriteRecord>(NS_FAVORITES);
    const target = makePlayRecordKey(source, id);
    return records.some((r) => makePlayRecordKey(r.source, r.id) === target);
  }

  async addFavorite(record: FavoriteRecord): Promise<void> {
    const records = await _readArray<FavoriteRecord>(NS_FAVORITES);
    const target = makePlayRecordKey(record.source, record.id);
    const rest = records.filter((r) => makePlayRecordKey(r.source, r.id) !== target);
    rest.push(record);
    if (rest.length > 1000) {
      rest.sort((a, b) => a.updatedAt - b.updatedAt);
      rest.splice(0, rest.length - 1000);
    }
    await _writeArray(NS_FAVORITES, rest);
  }

  async removeFavorite(source: string, id: string): Promise<void> {
    const records = await _readArray<FavoriteRecord>(NS_FAVORITES);
    const target = makePlayRecordKey(source, id);
    await _writeArray(
      NS_FAVORITES,
      records.filter((r) => makePlayRecordKey(r.source, r.id) !== target),
    );
  }

  async clearFavorites(): Promise<void> {
    await _writeArray(NS_FAVORITES, []);
  }

  async listSubscriptions(): Promise<SubscriptionRecord[]> {
    const records = await _readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    return records.sort((a, b) => {
      const aNew = a.latestEpisodeCount > a.knownEpisodeCount ? 1 : 0;
      const bNew = b.latestEpisodeCount > b.knownEpisodeCount ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      return b.subscribedAt - a.subscribedAt;
    });
  }

  async hasSubscription(source: string, id: string): Promise<boolean> {
    const records = await _readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const target = makePlayRecordKey(source, id);
    return records.some((r) => makePlayRecordKey(r.source, r.id) === target);
  }

  async getSubscription(source: string, id: string): Promise<SubscriptionRecord | null> {
    const records = await _readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const target = makePlayRecordKey(source, id);
    return records.find((r) => makePlayRecordKey(r.source, r.id) === target) ?? null;
  }

  async putSubscription(record: SubscriptionRecord): Promise<void> {
    const records = await _readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const target = makePlayRecordKey(record.source, record.id);
    const rest = records.filter((r) => makePlayRecordKey(r.source, r.id) !== target);
    rest.push(record);
    if (rest.length > 500) {
      rest.sort((a, b) => a.subscribedAt - b.subscribedAt);
      rest.splice(0, rest.length - 500);
    }
    await _writeArray(NS_SUBSCRIPTIONS, rest);
  }

  async removeSubscription(source: string, id: string): Promise<void> {
    const records = await _readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const target = makePlayRecordKey(source, id);
    await _writeArray(
      NS_SUBSCRIPTIONS,
      records.filter((r) => makePlayRecordKey(r.source, r.id) !== target),
    );
  }

  async updateSubscriptionChecks(
    updates: Array<{ source: string; id: string; latestEpisodeCount: number }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    const records = await _readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const byKey = new Map(updates.map((u) => [makePlayRecordKey(u.source, u.id), u]));
    const now = Date.now();
    let changed = false;
    const next = records.map((r) => {
      const u = byKey.get(makePlayRecordKey(r.source, r.id));
      if (!u) return r;
      if (u.latestEpisodeCount === r.latestEpisodeCount && now - r.lastCheckedAt < 1000) return r;
      changed = true;
      return { ...r, latestEpisodeCount: u.latestEpisodeCount, lastCheckedAt: now };
    });
    if (changed) await _writeArray(NS_SUBSCRIPTIONS, next);
  }

  async acknowledgeSubscription(source: string, id: string): Promise<void> {
    const records = await _readArray<SubscriptionRecord>(NS_SUBSCRIPTIONS);
    const target = makePlayRecordKey(source, id);
    let changed = false;
    const next = records.map((r) => {
      if (makePlayRecordKey(r.source, r.id) !== target) return r;
      if (r.knownEpisodeCount >= r.latestEpisodeCount) return r;
      changed = true;
      return { ...r, knownEpisodeCount: r.latestEpisodeCount };
    });
    if (changed) await _writeArray(NS_SUBSCRIPTIONS, next);
  }

  async clearSubscriptions(): Promise<void> {
    await _writeArray(NS_SUBSCRIPTIONS, []);
  }
}

export const nativeStorageBackend = new NativeStorageBackend();
