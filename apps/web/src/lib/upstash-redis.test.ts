import { describe, expect, it, vi } from 'vitest';
import { createUpstashClient } from './upstash-redis';

interface FakeFetchCall {
  url: string;
  init: RequestInit;
  body: unknown;
}

function makeFetch(responses: unknown[]): { fn: typeof fetch; calls: FakeFetchCall[] } {
  const calls: FakeFetchCall[] = [];
  let i = 0;
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const body = init?.body ? JSON.parse(init.body as string) : null;
    calls.push({ url, init: init ?? {}, body });
    const payload = responses[i++] ?? { result: null };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe('createUpstashClient', () => {
  const base = { url: 'https://example.upstash.io', token: 'tok-xyz' };

  it('sends Authorization header and JSON command body', async () => {
    const { fn, calls } = makeFetch([{ result: 'ok' }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    await client.hget('hash', 'field');

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://example.upstash.io');
    expect(calls[0]?.body).toEqual(['HGET', 'hash', 'field']);
    const headers = (calls[0]?.init.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-xyz');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('throws when Upstash returns an error payload', async () => {
    const { fn } = makeFetch([{ error: 'Unauthorized', status: 401 }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    await expect(client.hget('h', 'f')).rejects.toThrow(/HGET.*Unauthorized/);
  });

  it('decodes JSON-stringified hash values automatically', async () => {
    const stored = JSON.stringify({ okCount: 3, lastError: 'x' });
    const { fn } = makeFetch([{ result: stored }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    const rec = await client.hget<{ okCount: number; lastError: string }>('h', 'f');
    expect(rec).toEqual({ okCount: 3, lastError: 'x' });
  });

  it('falls back to raw string when the value is not JSON', async () => {
    const { fn } = makeFetch([{ result: 'plain-text' }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    const val = await client.hget<string>('h', 'f');
    expect(val).toBe('plain-text');
  });

  it('returns null for missing hash field', async () => {
    const { fn } = makeFetch([{ result: null }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    expect(await client.hget('h', 'f')).toBeNull();
  });

  it('converts HGETALL flat-array response into a keyed object', async () => {
    const flat = ['a', JSON.stringify({ n: 1 }), 'b', JSON.stringify({ n: 2 })];
    const { fn } = makeFetch([{ result: flat }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    const all = await client.hgetall<{ n: number }>('h');
    expect(all).toEqual({ a: { n: 1 }, b: { n: 2 } });
  });

  it('returns null for empty HGETALL', async () => {
    const { fn } = makeFetch([{ result: [] }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    expect(await client.hgetall('h')).toBeNull();
  });

  it('also handles HGETALL responses shaped as a plain object', async () => {
    const { fn } = makeFetch([{ result: { a: JSON.stringify({ n: 1 }) } }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    const all = await client.hgetall<{ n: number }>('h');
    expect(all).toEqual({ a: { n: 1 } });
  });

  it('serializes object values for HSET and counts added fields', async () => {
    const { fn, calls } = makeFetch([{ result: 1 }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    const added = await client.hset('h', { cms1: { okCount: 5 } });
    expect(added).toBe(1);
    expect(calls[0]?.body).toEqual(['HSET', 'h', 'cms1', JSON.stringify({ okCount: 5 })]);
  });

  it('passes strings through untouched for HSET', async () => {
    const { fn, calls } = makeFetch([{ result: 1 }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    await client.hset('h', { f: 'bare' });
    expect(calls[0]?.body).toEqual(['HSET', 'h', 'f', 'bare']);
  });

  it('forwards HDEL fields and returns the deleted count', async () => {
    const { fn, calls } = makeFetch([{ result: 2 }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    const count = await client.hdel('h', 'a', 'b');
    expect(count).toBe(2);
    expect(calls[0]?.body).toEqual(['HDEL', 'h', 'a', 'b']);
  });

  it('short-circuits HDEL with no fields', async () => {
    const { fn, calls } = makeFetch([]);
    const client = createUpstashClient({ ...base, fetch: fn });
    expect(await client.hdel('h')).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('forwards DEL keys and returns the deleted count', async () => {
    const { fn, calls } = makeFetch([{ result: 2 }]);
    const client = createUpstashClient({ ...base, fetch: fn });
    const count = await client.del('k1', 'k2');
    expect(count).toBe(2);
    expect(calls[0]?.body).toEqual(['DEL', 'k1', 'k2']);
  });
});
