import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signProxyUrl, verifyProxyToken } from './proxy-auth';

const ORIGINAL_SECRET = process.env.PROXY_SECRET;

beforeEach(() => {
  process.env.PROXY_SECRET = 'test-secret-do-not-use-in-prod';
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete (process.env as Record<string, string | undefined>).PROXY_SECRET;
  } else {
    process.env.PROXY_SECRET = ORIGINAL_SECRET;
  }
});

describe('signProxyUrl', () => {
  it('produces a base64url token (no =/+//) and a future expiry', () => {
    const { token, expiresAt } = signProxyUrl('https://cdn.example.com/a.m3u8');
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url charset only
    expect(expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('buckets expiresAt to a 300s boundary (for CDN cache-key stability)', () => {
    const { expiresAt } = signProxyUrl('https://a.example/x.m3u8');
    expect(expiresAt % 300).toBe(0);
  });

  it('two signatures for the same URL within a bucket are byte-identical', () => {
    // This is the whole point of bucketing — without it, every request would
    // bust the CDN cache key.
    const a = signProxyUrl('https://cdn.example.com/playlist.m3u8');
    const b = signProxyUrl('https://cdn.example.com/playlist.m3u8');
    expect(a.token).toBe(b.token);
    expect(a.expiresAt).toBe(b.expiresAt);
  });

  it('different URLs produce different tokens even in the same bucket', () => {
    const a = signProxyUrl('https://cdn.example.com/a.m3u8');
    const b = signProxyUrl('https://cdn.example.com/b.m3u8');
    expect(a.token).not.toBe(b.token);
    expect(a.expiresAt).toBe(b.expiresAt); // same bucket
  });

  it('respects custom ttlSeconds (expiry at least now+ttl)', () => {
    const before = Math.floor(Date.now() / 1000);
    const { expiresAt } = signProxyUrl('https://a.example/x', 7200);
    expect(expiresAt).toBeGreaterThanOrEqual(before + 7200);
    // and still at most one bucket beyond
    expect(expiresAt).toBeLessThan(before + 7200 + 300);
  });
});

describe('verifyProxyToken', () => {
  it('accepts a freshly signed token', () => {
    const url = 'https://cdn.example.com/a.m3u8';
    const { token, expiresAt } = signProxyUrl(url);
    expect(verifyProxyToken(url, expiresAt, token)).toBe(true);
  });

  it('rejects when the URL is tampered with (HMAC body changed)', () => {
    const url = 'https://cdn.example.com/a.m3u8';
    const { token, expiresAt } = signProxyUrl(url);
    expect(verifyProxyToken('https://cdn.example.com/b.m3u8', expiresAt, token)).toBe(false);
  });

  it('rejects when expiresAt is tampered with', () => {
    const url = 'https://cdn.example.com/a.m3u8';
    const { token, expiresAt } = signProxyUrl(url);
    expect(verifyProxyToken(url, expiresAt + 300, token)).toBe(false);
  });

  it('rejects when the token itself is tampered with', () => {
    const url = 'https://cdn.example.com/a.m3u8';
    const { token, expiresAt } = signProxyUrl(url);
    // Flip char at position 1 — guaranteed to change the decoded HMAC regardless
    // of base64url padding layout (last-char flip can be a no-op on padding bits).
    const flipped = token[1] === 'A' ? 'B' : 'A';
    const bad = token[0] + flipped + token.slice(2);
    expect(verifyProxyToken(url, expiresAt, bad)).toBe(false);
  });

  it('rejects tokens with wrong length (prevents timing-leak via length check)', () => {
    const url = 'https://cdn.example.com/a.m3u8';
    const { expiresAt } = signProxyUrl(url);
    expect(verifyProxyToken(url, expiresAt, 'short')).toBe(false);
    // also: random gibberish that's even a wrong size
    expect(verifyProxyToken(url, expiresAt, 'a'.repeat(100))).toBe(false);
  });

  it('rejects expired tokens (expiresAt in the past)', () => {
    const url = 'https://cdn.example.com/a.m3u8';
    const { token } = signProxyUrl(url);
    const past = Math.floor(Date.now() / 1000) - 10;
    expect(verifyProxyToken(url, past, token)).toBe(false);
  });

  it('rejects non-finite expiresAt (NaN, Infinity)', () => {
    expect(verifyProxyToken('https://a/x', Number.NaN, 'whatever')).toBe(false);
    expect(verifyProxyToken('https://a/x', Number.POSITIVE_INFINITY, 'whatever')).toBe(false);
  });

  it('does NOT verify when signed under a different secret', () => {
    const url = 'https://cdn.example.com/a.m3u8';
    const { token, expiresAt } = signProxyUrl(url);
    process.env.PROXY_SECRET = 'a-completely-different-secret';
    expect(verifyProxyToken(url, expiresAt, token)).toBe(false);
  });
});

describe('PROXY_SECRET requirement', () => {
  it('throws if PROXY_SECRET is unset when signing', () => {
    delete (process.env as Record<string, string | undefined>).PROXY_SECRET;
    expect(() => signProxyUrl('https://a.example/x')).toThrow(/PROXY_SECRET/);
  });

  it('throws if PROXY_SECRET is unset when verifying', () => {
    // we still need a valid-looking token shape to reach the secret read
    delete (process.env as Record<string, string | undefined>).PROXY_SECRET;
    const future = Math.floor(Date.now() / 1000) + 300;
    expect(() => verifyProxyToken('https://a.example/x', future, 'abc')).toThrow(/PROXY_SECRET/);
  });
});
