import type { FavoriteRecord, IStorage } from '@marstv/core';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeStubStorage() {
  return {
    listFavorites: vi.fn(async () => [] as FavoriteRecord[]),
    addFavorite: vi.fn(async () => {}),
    removeFavorite: vi.fn(async () => {}),
    clearFavorites: vi.fn(async () => {}),
  };
}

async function loadRoute(storage: Partial<IStorage> | null) {
  vi.doMock('@/lib/storage', () => ({
    getServerStorage: () => storage,
    isCloudStorageEnabled: () => storage != null,
  }));
  return (await import('./route')) as {
    GET: (req: NextRequest) => Promise<Response>;
    POST: (req: NextRequest) => Promise<Response>;
  };
}

function getReq(): NextRequest {
  return new NextRequest('http://app.local/api/storage/favorites');
}

function req(body: unknown, { raw = false }: { raw?: boolean } = {}): NextRequest {
  return new NextRequest('http://app.local/api/storage/favorites', {
    method: 'POST',
    body: raw ? (body as string) : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const validRecord: FavoriteRecord = {
  source: 'cms1',
  id: 'vid1',
  title: 'T',
  updatedAt: 1,
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('@/lib/storage');
});

describe('/api/storage/favorites — cloud disabled', () => {
  it('GET returns 501', async () => {
    const { GET } = await loadRoute(null);
    expect((await GET(getReq())).status).toBe(501);
  });
  it('POST returns 501', async () => {
    const { POST } = await loadRoute(null);
    expect((await POST(req({ action: 'clear' }))).status).toBe(501);
  });
});

describe('/api/storage/favorites — cloud enabled', () => {
  it('GET lists', async () => {
    const stub = makeStubStorage();
    stub.listFavorites.mockResolvedValueOnce([validRecord]);
    const { GET } = await loadRoute(stub as unknown as IStorage);
    expect(await (await GET(getReq())).json()).toEqual({ records: [validRecord] });
  });

  it('add delegates + validates', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    await POST(req({ action: 'add', record: validRecord }));
    expect(stub.addFavorite).toHaveBeenCalledWith(validRecord);
    const bad = await POST(req({ action: 'add', record: {} }));
    expect(bad.status).toBe(400);
  });

  it('remove delegates + validates', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    await POST(req({ action: 'remove', source: 's', id: 'i' }));
    expect(stub.removeFavorite).toHaveBeenCalledWith('s', 'i');
    const bad = await POST(req({ action: 'remove' }));
    expect(bad.status).toBe(400);
  });

  it('clear delegates', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    const res = await POST(req({ action: 'clear' }));
    expect(res.status).toBe(200);
    expect(stub.clearFavorites).toHaveBeenCalled();
  });

  it('rejects bad JSON + unknown action', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    expect((await POST(req('!!', { raw: true }))).status).toBe(400);
    expect((await POST(req({ action: 'xx' }))).status).toBe(400);
  });
});
