// ============================================================================
// Site password gate (optional deploy-time password wall).
//
// When `SITE_PASSWORD` is set, all top-level requests must present a valid
// auth cookie. The cookie value is `HMAC(SITE_PASSWORD, TOKEN_CONTEXT)` — a
// deterministic digest that any process knowing the same password can verify,
// so this works statelessly across restarts and edge replicas. Changing the
// env value immediately invalidates every issued cookie.
//
// `SITE_PASSWORD` unset or empty → gate is disabled; `isEnabled()` short-
// circuits middleware and login routes.
// ============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';

export const AUTH_COOKIE_NAME = 'marstv_auth';

// Fixed context string mixed into the HMAC so the cookie isn't just the raw
// password digest — versioned so we can rotate token format later without
// reusing old HMAC inputs.
const TOKEN_CONTEXT = 'marstv-site-auth-v1';

export function getSitePassword(): string | null {
  const raw = process.env.SITE_PASSWORD;
  if (!raw || raw.length === 0) return null;
  return raw;
}

export function isEnabled(): boolean {
  return getSitePassword() !== null;
}

export function createToken(password: string): string {
  return createHmac('sha256', password).update(TOKEN_CONTEXT).digest('hex');
}

export function verifyToken(token: string | undefined | null): boolean {
  const password = getSitePassword();
  if (password === null) return true;
  if (!token || typeof token !== 'string') return false;
  const expected = createToken(password);
  // Hex strings are ASCII-safe; length mismatch means not our token.
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function verifyPassword(input: string | undefined | null): boolean {
  const password = getSitePassword();
  if (password === null) return true;
  if (!input || typeof input !== 'string') return false;
  const a = Buffer.from(input);
  const b = Buffer.from(password);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
