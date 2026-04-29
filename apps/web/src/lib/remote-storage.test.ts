import type { FavoriteRecord, PlayRecord, SubscriptionRecord } from '@marstv/core';
import { describe, expect, it, vi } from 'vitest';
import { createRemoteStorage } from './remote-storage';

function makeFetch(responses: Array<{ ok?: boolean; status?: number; body: unknown }>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const queue = [...responses];
  const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push({ url, init });
    const next = queue.shift();
    if (!next) throw new Error(`unexpected fetch: ${url}`);
    return {
      ok: next.ok ?? true,
      status: next.status ?? 200,
      json: async () => next.body,
    } as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const playRec: PlayRecord = {
  source: 'cms1',
  id: 'v1',
  title: 'T',
  lineIdx: 0,
  epIdx: 0,
  positionSec: 10,
  durationSec: 100,
  updatedAt: 1,
};

const favRec: FavoriteRecord = { source: 'cms1', id: 'v1', title: 'T', updatedAt: 1 };

const subRec: SubscriptionRecord = {
  source: 'cms1',
  id: 'v1',
  title: 'T',
  lineIdx: 0,
  knownEpisodeCount: 5,
  latestEpisodeCount: 5,
  subscribedAt: 1,
  lastCheckedAt: 1,
};

describe('remote-storage — play records', () => {
  it('listPlayRecords GETs and unwraps', async () => {
    const { fetchImpl, calls } = makeFetch([{ body: { records: [playRec] } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    const out = await storage.listPlayRecords();
    expect(out).toEqual([playRec]);
    expect(calls[0].url).toBe('/api/storage/history');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('returns [] when fetch fails', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('net');
    }) as unknown as typeof fetch;
    const storage = createRemoteStorage({ fetch: fetchImpl });
    expect(await storage.listPlayRecords()).toEqual([]);
  });

  it('returns [] when server responds !ok', async () => {
    const { fetchImpl } = makeFetch([{ ok: false, status: 501, body: {} }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    expect(await storage.listPlayRecords()).toEqual([]);
  });

  it('putPlayRecord POSTs put action', async () => {
    const { fetchImpl, calls } = makeFetch([{ body: { ok: true } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    await storage.putPlayRecord(playRec);
    expect(calls[0].url).toBe('/api/storage/history');
    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ action: 'put', record: playRec });
  });

  it('putPlayRecord throws on server failure', async () => {
    const { fetchImpl } = makeFetch([{ ok: false, status: 500, body: {} }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    await expect(storage.putPlayRecord(playRec)).rejects.toThrow(/failed/);
  });

  it('removePlayRecord POSTs remove', async () => {
    const { fetchImpl, calls } = makeFetch([{ body: { ok: true } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    await storage.removePlayRecord('s', 'i');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      action: 'remove',
      source: 's',
      id: 'i',
    });
  });

  it('clearPlayRecords POSTs clear', async () => {
    const { fetchImpl, calls } = makeFetch([{ body: { ok: true } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    await storage.clearPlayRecords();
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ action: 'clear' });
  });

  it('getPlayRecord finds via list', async () => {
    const { fetchImpl } = makeFetch([{ body: { records: [playRec] } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    expect(await storage.getPlayRecord('cms1', 'v1')).toEqual(playRec);
  });

  it('getPlayRecord returns null on miss', async () => {
    const { fetchImpl } = makeFetch([{ body: { records: [] } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    expect(await storage.getPlayRecord('x', 'y')).toBeNull();
  });
});

describe('remote-storage — favorites', () => {
  it('listFavorites unwraps', async () => {
    const { fetchImpl } = makeFetch([{ body: { records: [favRec] } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    expect(await storage.listFavorites()).toEqual([favRec]);
  });

  it('hasFavorite via list', async () => {
    const { fetchImpl } = makeFetch([
      { body: { records: [favRec] } },
      { body: { records: [favRec] } },
    ]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    expect(await storage.hasFavorite('cms1', 'v1')).toBe(true);
    expect(await storage.hasFavorite('cms1', 'missing')).toBe(false);
  });

  it('addFavorite POSTs add', async () => {
    const { fetchImpl, calls } = makeFetch([{ body: { ok: true } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    await storage.addFavorite(favRec);
    expect(calls[0].url).toBe('/api/storage/favorites');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ action: 'add', record: favRec });
  });

  it('removeFavorite + clearFavorites', async () => {
    const { fetchImpl, calls } = makeFetch([{ body: { ok: true } }, { body: { ok: true } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    await storage.removeFavorite('s', 'i');
    await storage.clearFavorites();
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      action: 'remove',
      source: 's',
      id: 'i',
    });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ action: 'clear' });
  });
});

describe('remote-storage — subscriptions', () => {
  it('listSubscriptions unwraps', async () => {
    const { fetchImpl } = makeFetch([{ body: { records: [subRec] } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    expect(await storage.listSubscriptions()).toEqual([subRec]);
  });

  it('hasSubscription / getSubscription via list', async () => {
    const { fetchImpl } = makeFetch([
      { body: { records: [subRec] } },
      { body: { records: [subRec] } },
    ]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    expect(await storage.hasSubscription('cms1', 'v1')).toBe(true);
    expect(await storage.getSubscription('cms1', 'v1')).toEqual(subRec);
  });

  it('putSubscription / remove / acknowledge / clear', async () => {
    const { fetchImpl, calls } = makeFetch([
      { body: { ok: true } },
      { body: { ok: true } },
      { body: { ok: true } },
      { body: { ok: true } },
    ]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    await storage.putSubscription(subRec);
    await storage.removeSubscription('s', 'i');
    await storage.acknowledgeSubscription('s', 'i');
    await storage.clearSubscriptions();
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({ action: 'put' });
    expect(JSON.parse(String(calls[1].init?.body))).toMatchObject({ action: 'remove' });
    expect(JSON.parse(String(calls[2].init?.body))).toMatchObject({ action: 'acknowledge' });
    expect(JSON.parse(String(calls[3].init?.body))).toMatchObject({ action: 'clear' });
  });

  it('updateSubscriptionChecks skips empty updates', async () => {
    const fetchImpl = vi.fn(
      async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response,
    ) as unknown as typeof fetch;
    const storage = createRemoteStorage({ fetch: fetchImpl });
    await storage.updateSubscriptionChecks([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('updateSubscriptionChecks POSTs when non-empty', async () => {
    const { fetchImpl, calls } = makeFetch([{ body: { ok: true } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl });
    const updates = [{ source: 's', id: 'i', latestEpisodeCount: 3 }];
    await storage.updateSubscriptionChecks(updates);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      action: 'updateChecks',
      updates,
    });
  });
});

describe('remote-storage — options', () => {
  it('respects baseUrl override', async () => {
    const { fetchImpl, calls } = makeFetch([{ body: { records: [] } }]);
    const storage = createRemoteStorage({ fetch: fetchImpl, baseUrl: 'https://remote.example' });
    await storage.listPlayRecords();
    expect(calls[0].url).toBe('https://remote.example/api/storage/history');
  });
});
