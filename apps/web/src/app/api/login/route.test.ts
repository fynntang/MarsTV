import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL = process.env.SITE_PASSWORD;

beforeEach(() => {
  vi.resetModules();
  delete process.env.SITE_PASSWORD;
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SITE_PASSWORD;
  else process.env.SITE_PASSWORD = ORIGINAL;
});

async function loadRoute(): Promise<(req: NextRequest) => Promise<Response>> {
  const mod = await import('./route');
  return mod.POST;
}

function jsonReq(body: unknown): NextRequest {
  return new NextRequest('http://app.local/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function formReq(params: Record<string, string>): NextRequest {
  const body = new URLSearchParams(params).toString();
  return new NextRequest('http://app.local/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
}

describe('POST /api/login', () => {
  it('returns 503 when SITE_PASSWORD is unconfigured', async () => {
    const POST = await loadRoute();
    const res = await POST(jsonReq({ password: 'whatever' }));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/not configured/);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  describe('when SITE_PASSWORD is set', () => {
    beforeEach(() => {
      process.env.SITE_PASSWORD = 'hunter2';
    });

    it('returns 400 if password field is missing from JSON body', async () => {
      const POST = await loadRoute();
      const res = await POST(jsonReq({}));
      expect(res.status).toBe(400);
    });

    it('returns 400 if JSON body is malformed', async () => {
      const POST = await loadRoute();
      const req = new NextRequest('http://app.local/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not-json',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 401 on wrong password', async () => {
      const POST = await loadRoute();
      const res = await POST(jsonReq({ password: 'nope' }));
      expect(res.status).toBe(401);
      expect(res.headers.get('set-cookie')).toBeNull();
    });

    it('accepts correct JSON password and sets an HttpOnly SameSite=Lax cookie', async () => {
      const POST = await loadRoute();
      const res = await POST(jsonReq({ password: 'hunter2' }));
      expect(res.status).toBe(200);
      const cookie = res.headers.get('set-cookie');
      expect(cookie).toMatch(/^marstv_auth=[0-9a-f]{64};/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Lax/);
      expect(cookie).toMatch(/Path=\//);
    });

    it('accepts correct form-encoded password', async () => {
      const POST = await loadRoute();
      const res = await POST(formReq({ password: 'hunter2' }));
      expect(res.status).toBe(200);
      expect(res.headers.get('set-cookie')).toMatch(/^marstv_auth=/);
    });

    it('case-sensitive password check', async () => {
      const POST = await loadRoute();
      const res = await POST(jsonReq({ password: 'HUNTER2' }));
      expect(res.status).toBe(401);
    });

    it('response carries cache-control: no-store', async () => {
      const POST = await loadRoute();
      const res = await POST(jsonReq({ password: 'hunter2' }));
      expect(res.headers.get('cache-control')).toBe('no-store');
    });

    it('omits Secure flag under test/dev NODE_ENV', async () => {
      // NODE_ENV is 'test' inside vitest; Secure is only added in production.
      expect(process.env.NODE_ENV).not.toBe('production');
      const POST = await loadRoute();
      const res = await POST(jsonReq({ password: 'hunter2' }));
      const cookie = res.headers.get('set-cookie') ?? '';
      expect(cookie).not.toMatch(/Secure/);
    });
  });
});
