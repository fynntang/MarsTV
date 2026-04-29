import type { IStorage, PlayRecord } from '@marstv/core';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stub fixture. Only the methods touched by the history route matter.
function makeStubStorage(): {
  listPlayRecords: ReturnType<typeof vi.fn>;
  putPlayRecord: ReturnType<typeof vi.fn>;
  removePlayRecord: ReturnType<typeof vi.fn>;
  clearPlayRecords: ReturnType<typeof vi.fn>;
} {
  return {
    listPlayRecords: vi.fn(async () => [] as PlayRecord[]),
    putPlayRecord: vi.fn(async () => {}),
    removePlayRecord: vi.fn(async () => {}),
    clearPlayRecords: vi.fn(async () => {}),
  };
}

async function loadRoute(storage: Partial<IStorage> | null): Promise<{
  GET: () => Promise<Response>;
  POST: (req: NextRequest) => Promise<Response>;
}> {
  vi.doMock('@/lib/storage', () => ({
    getServerStorage: () => storage,
    isCloudStorageEnabled: () => storage != null,
  }));
  return (await import('./route')) as {
    GET: () => Promise<Response>;
    POST: (req: NextRequest) => Promise<Response>;
  };
}

function req(body: unknown, { raw = false }: { raw?: boolean } = {}): NextRequest {
  return new NextRequest('http://app.local/api/storage/history', {
    method: 'POST',
    body: raw ? (body as string) : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const validRecord: PlayRecord = {
  source: 'cms1',
  id: 'vid1',
  title: 'T',
  lineIdx: 0,
  epIdx: 0,
  positionSec: 10,
  durationSec: 100,
  updatedAt: 1,
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('@/lib/storage');
});

describe('/api/storage/history — cloud disabled', () => {
  it('GET returns 501', async () => {
    const { GET } = await loadRoute(null);
    const res = await GET();
    expect(res.status).toBe(501);
  });

  it('POST returns 501', async () => {
    const { POST } = await loadRoute(null);
    const res = await POST(req({ action: 'clear' }));
    expect(res.status).toBe(501);
  });
});

describe('/api/storage/history — cloud enabled', () => {
  it('GET lists records', async () => {
    const stub = makeStubStorage();
    stub.listPlayRecords.mockResolvedValueOnce([validRecord]);
    const { GET } = await loadRoute(stub as unknown as IStorage);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ records: [validRecord] });
  });

  it('POST put delegates to putPlayRecord', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    const res = await POST(req({ action: 'put', record: validRecord }));
    expect(res.status).toBe(200);
    expect(stub.putPlayRecord).toHaveBeenCalledWith(validRecord);
  });

  it('POST put rejects invalid shape', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    const res = await POST(req({ action: 'put', record: { source: 'x' } }));
    expect(res.status).toBe(400);
    expect(stub.putPlayRecord).not.toHaveBeenCalled();
  });

  it('POST remove delegates', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    const res = await POST(req({ action: 'remove', source: 'cms1', id: 'vid1' }));
    expect(res.status).toBe(200);
    expect(stub.removePlayRecord).toHaveBeenCalledWith('cms1', 'vid1');
  });

  it('POST remove rejects missing ids', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    const res = await POST(req({ action: 'remove', source: 'cms1' }));
    expect(res.status).toBe(400);
  });

  it('POST clear delegates', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    const res = await POST(req({ action: 'clear' }));
    expect(res.status).toBe(200);
    expect(stub.clearPlayRecords).toHaveBeenCalled();
  });

  it('POST rejects invalid JSON', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    const res = await POST(req('not-json', { raw: true }));
    expect(res.status).toBe(400);
  });

  it('POST rejects unknown action', async () => {
    const stub = makeStubStorage();
    const { POST } = await loadRoute(stub as unknown as IStorage);
    const res = await POST(req({ action: 'explode' }));
    expect(res.status).toBe(400);
  });
});
