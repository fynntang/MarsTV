// ============================================================================
// HMAC signing for /api/proxy/*
// Token = base64url( HMAC-SHA256(secret, `${url}|${expiresAt}`) )
// URL shape: /api/proxy/m3u8?u=<encoded>&e=<expiresAt>&s=<token>
//
// expiresAt is rounded UP to a BUCKET_SECONDS boundary so that two requests
// for the same upstream URL within the same bucket window produce byte-
// identical proxy URLs — that's what unlocks CDN edge caching. Without
// bucketing, each request gets a unique token and every cache key is a miss.
// ============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';

// 5 min buckets: small enough that the effective TTL overrun is negligible,
// large enough that typical viewing traffic clusters within a single bucket.
const BUCKET_SECONDS = 300;

function getSecret(): string {
  const secret = process.env.PROXY_SECRET;
  if (!secret) {
    throw new Error('PROXY_SECRET env var is required');
  }
  return secret;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function signProxyUrl(
  targetUrl: string,
  ttlSeconds = 3600,
): {
  token: string;
  expiresAt: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const raw = now + ttlSeconds;
  // Round UP: ensures the token lives at least ttlSeconds, up to +BUCKET_SECONDS.
  const expiresAt = Math.ceil(raw / BUCKET_SECONDS) * BUCKET_SECONDS;
  const payload = `${targetUrl}|${expiresAt}`;
  const mac = createHmac('sha256', getSecret()).update(payload).digest();
  return { token: base64url(mac), expiresAt };
}

export function verifyProxyToken(targetUrl: string, expiresAt: number, token: string): boolean {
  if (!Number.isFinite(expiresAt)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt < now) return false;

  const expected = createHmac('sha256', getSecret()).update(`${targetUrl}|${expiresAt}`).digest();
  const provided = Buffer.from(
    token
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(token.length + ((4 - (token.length % 4)) % 4), '='),
    'base64',
  );
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
