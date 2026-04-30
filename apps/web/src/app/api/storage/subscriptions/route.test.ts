import type { IStorage, SubscriptionRecord } from '@marstv/core';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeStubStorage() {
  return {
    listSubscriptions: vi.fn(async () => [] as SubscriptionRecord[]),
    putSubscription: vi.fn(async () => {}),
    removeSubscription: vi.fn(async () => {}),
    acknowledgeSubscription: vi.fn(async () => {}),
    updateSubscriptionChecks: vi.fn(async () => {}),
    clearSubscriptions: vi.fn(async () => {}),
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
  return new NextRequest('http://app.local/api/storage/subscriptions');
}

function req(body: unknown, { raw = false }: { raw?: boolean } = {}): NextRequest {
  return new NextRequest('http://app.local/api/storage/subscriptions', {
    method: 'POST',
    body: raw ? (body as string) : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const validRecord: SubscriptionRecord = {
  source: 'cms1',
  id: 'vid1',
  title: 'T',
  lineIdx: 0,
  knownEpisodeCount: 5,
  latestEpisodeCount: 5,
  subscribedAt: 1,
  lastCheckedAt: 1,
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('@/lib/storage');
});

describe('/api/storage/subscriptions — cloud disabled', () => {
  it('GET returns 501', async () => {
    const { GET } = await loadRoute(null);
    expect((await GET(getReq())).status).toBe(501);
  });
  it('POST returns 501', async () => {
    const { POST } = await loadRoute(null);
    expect((await POST(req({ action: 'clear' }))).status).toBe(501);
  });
});

describe('/api/storage/subscriptions — cloud enabled', () => {
  it('GET lists', async () => {
    const stub = makeStubStorage();
    stub.listSubscriptions.mockResolvedValueOnce([validRecord]);
    const { GET } = await loadRoute(stub as unknown as IStorage);
    expect(await (await GET(getReq())).json()).toEqual({ records: [validRecord] });
  });

  it('put delegates + validates', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    await POST(req({ action: 'put', record: validRecord }));
    expect(stub.putSubscription).toHaveBeenCalledWith(validRecord);
    expect((await POST(req({ action: 'put', record: { title: 'x' } }))).status).toBe(400);
  });

  it('remove delegates + validates', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    await POST(req({ action: 'remove', source: 's', id: 'i' }));
    expect(stub.removeSubscription).toHaveBeenCalledWith('s', 'i');
    expect((await POST(req({ action: 'remove' }))).status).toBe(400);
  });

  it('acknowledge delegates', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    await POST(req({ action: 'acknowledge', source: 's', id: 'i' }));
    expect(stub.acknowledgeSubscription).toHaveBeenCalledWith('s', 'i');
  });

  it('updateChecks validates each update', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    await POST(
      req({
        action: 'updateChecks',
        updates: [{ source: 's', id: 'i', latestEpisodeCount: 3 }],
      }),
    );
    expect(stub.updateSubscriptionChecks).toHaveBeenCalledWith([
      { source: 's', id: 'i', latestEpisodeCount: 3 },
    ]);
    const bad = await POST(req({ action: 'updateChecks', updates: [{ source: 's', id: 'i' }] }));
    expect(bad.status).toBe(400);
  });

  it('clear delegates', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    await POST(req({ action: 'clear' }));
    expect(stub.clearSubscriptions).toHaveBeenCalled();
  });

  it('rejects bad JSON + unknown action', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    expect((await POST(req('!!', { raw: true }))).status).toBe(400);
    expect((await POST(req({ action: 'xx' }))).status).toBe(400);
  });
});
