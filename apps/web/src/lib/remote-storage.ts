// ============================================================================
// Remote IStorage implementation — calls /api/storage/* so the browser never
// writes directly to Redis (no CORS, no token exposure).
//
// Used when the deployment has cloud storage enabled (SITE_PASSWORD +
// UPSTASH_*). Selected by `getClientStorage()` at render time.
//
// Error handling: network failures in reads return empty lists / null so the
// UI degrades gracefully (e.g. offline → empty history, not a crash).
// Mutations re-throw so callers can surface "failed to save".
// ============================================================================

import type { FavoriteRecord, IStorage, PlayRecord, SubscriptionRecord } from '@marstv/core';
import { makePlayRecordKey } from '@marstv/core';

interface RemoteStorageOptions {
  /** Override for testing. Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Override for testing. Defaults to relative paths. */
  baseUrl?: string;
}

export function createRemoteStorage(options: RemoteStorageOptions = {}): IStorage {
  const fetchImpl = options.fetch ?? fetch;
  const base = options.baseUrl ?? '';

  async function get<T>(path: string, fallback: T): Promise<T> {
    try {
      const res = await fetchImpl(`${base}${path}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) return fallback;
      return (await res.json()) as T;
    } catch {
      return fallback;
    }
  }

  async function post(path: string, body: unknown): Promise<void> {
    const res = await fetchImpl(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`storage ${path} failed: ${res.status}`);
    }
  }

  return {
    // --- Play records ---
    async listPlayRecords() {
      const { records } = await get<{ records: PlayRecord[] }>('/api/storage/history', {
        records: [],
      });
      return records;
    },

    async getPlayRecord(source, id) {
      const records = await this.listPlayRecords();
      const target = makePlayRecordKey(source, id);
      return records.find((r) => makePlayRecordKey(r.source, r.id) === target) ?? null;
    },

    async putPlayRecord(record) {
      await post('/api/storage/history', { action: 'put', record });
    },

    async removePlayRecord(source, id) {
      await post('/api/storage/history', { action: 'remove', source, id });
    },

    async clearPlayRecords() {
      await post('/api/storage/history', { action: 'clear' });
    },

    // --- Favorites ---
    async listFavorites() {
      const { records } = await get<{ records: FavoriteRecord[] }>('/api/storage/favorites', {
        records: [],
      });
      return records;
    },

    async hasFavorite(source, id) {
      const records = await this.listFavorites();
      const target = makePlayRecordKey(source, id);
      return records.some((r) => makePlayRecordKey(r.source, r.id) === target);
    },

    async addFavorite(record) {
      await post('/api/storage/favorites', { action: 'add', record });
    },

    async removeFavorite(source, id) {
      await post('/api/storage/favorites', { action: 'remove', source, id });
    },

    async clearFavorites() {
      await post('/api/storage/favorites', { action: 'clear' });
    },

    // --- Subscriptions ---
    async listSubscriptions() {
      const { records } = await get<{ records: SubscriptionRecord[] }>(
        '/api/storage/subscriptions',
        { records: [] },
      );
      return records;
    },

    async hasSubscription(source, id) {
      const records = await this.listSubscriptions();
      const target = makePlayRecordKey(source, id);
      return records.some((r) => makePlayRecordKey(r.source, r.id) === target);
    },

    async getSubscription(source, id) {
      const records = await this.listSubscriptions();
      const target = makePlayRecordKey(source, id);
      return records.find((r) => makePlayRecordKey(r.source, r.id) === target) ?? null;
    },

    async putSubscription(record) {
      await post('/api/storage/subscriptions', { action: 'put', record });
    },

    async removeSubscription(source, id) {
      await post('/api/storage/subscriptions', { action: 'remove', source, id });
    },

    async updateSubscriptionChecks(updates) {
      if (updates.length === 0) return;
      await post('/api/storage/subscriptions', { action: 'updateChecks', updates });
    },

    async acknowledgeSubscription(source, id) {
      await post('/api/storage/subscriptions', { action: 'acknowledge', source, id });
    },

    async clearSubscriptions() {
      await post('/api/storage/subscriptions', { action: 'clear' });
    },
  };
}
