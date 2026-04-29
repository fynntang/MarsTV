// ============================================================================
// Minimal Upstash Redis REST client — implements the `IRedisLike` subset we
// need without pulling @upstash/redis as a dependency.
//
// Wire format: POST the URL with a JSON array `["CMD", ...args]` and a
//   `Authorization: Bearer <token>` header. Response is `{ result }` on
//   success or `{ error, status }` on failure.
// Serialization: object values are JSON-stringified on write so they can be
//   stored as strings in Redis hashes; reads attempt to JSON.parse and fall
//   back to the raw string. This matches @upstash/redis's default automatic
//   (de)serialization behavior so `createRedisSourceHealthStore` works the
//   same against either client.
// ============================================================================

import type { IRedisLike } from '@marstv/core';

export interface UpstashClientOptions {
  url: string;
  token: string;
  /** Override for testing. Defaults to global fetch. */
  fetch?: typeof fetch;
}

interface UpstashOkResponse {
  result: unknown;
}
interface UpstashErrResponse {
  error: string;
  status?: number;
}
type UpstashResponse = UpstashOkResponse | UpstashErrResponse;

function isErr(r: UpstashResponse): r is UpstashErrResponse {
  return 'error' in r;
}

function encodeValue(v: unknown): string {
  return typeof v === 'string' ? v : JSON.stringify(v);
}

function decodeValue<T>(raw: unknown): T | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export function createUpstashClient(options: UpstashClientOptions): IRedisLike {
  const { url, token } = options;
  const fetchImpl = options.fetch ?? fetch;

  async function exec<T = unknown>(command: unknown[]): Promise<T> {
    const resp = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    const json = (await resp.json()) as UpstashResponse;
    if (isErr(json)) {
      throw new Error(`Upstash ${command[0]} failed: ${json.error}`);
    }
    return json.result as T;
  }

  return {
    async hget<T = unknown>(key: string, field: string) {
      const raw = await exec<string | null>(['HGET', key, field]);
      return decodeValue<T>(raw);
    },

    async hgetall<T = unknown>(key: string) {
      // HGETALL returns a flat [k1, v1, k2, v2, ...] array in raw Redis.
      // Upstash REST preserves that shape. Empty key → empty array.
      const raw = await exec<unknown>(['HGETALL', key]);
      if (Array.isArray(raw)) {
        if (raw.length === 0) return null;
        const out: Record<string, T> = {};
        for (let i = 0; i < raw.length; i += 2) {
          const field = String(raw[i]);
          const value = decodeValue<T>(raw[i + 1]);
          if (value !== null) out[field] = value;
        }
        return out;
      }
      // Defensive: some Upstash SDK versions return an object directly. Decode
      // each value in that case.
      if (raw && typeof raw === 'object') {
        const src = raw as Record<string, unknown>;
        if (Object.keys(src).length === 0) return null;
        const out: Record<string, T> = {};
        for (const [k, v] of Object.entries(src)) {
          const decoded = decodeValue<T>(v);
          if (decoded !== null) out[k] = decoded;
        }
        return out;
      }
      return null;
    },

    async hset(key: string, values: Record<string, unknown>) {
      const args: unknown[] = ['HSET', key];
      for (const [f, v] of Object.entries(values)) {
        args.push(f, encodeValue(v));
      }
      return (await exec<number>(args)) ?? 0;
    },

    async hdel(key: string, ...fields: string[]) {
      if (fields.length === 0) return 0;
      return (await exec<number>(['HDEL', key, ...fields])) ?? 0;
    },

    async del(...keys: string[]) {
      if (keys.length === 0) return 0;
      return (await exec<number>(['DEL', ...keys])) ?? 0;
    },
  };
}
