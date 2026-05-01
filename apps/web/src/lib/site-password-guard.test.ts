import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createToken } from './site-password';
import { requireApiPassword } from './site-password-guard';

const ORIGINAL = process.env.SITE_PASSWORD;

function request(cookie?: string) {
  return new NextRequest('http://app.local/api/search?q=test', {
    headers: cookie ? { cookie } : undefined,
  });
}

describe('requireApiPassword', () => {
  beforeEach(() => {
    delete (process.env as Record<string, string | undefined>).SITE_PASSWORD;
  });

  afterEach(() => {
    if (ORIGINAL === undefined)
      delete (process.env as Record<string, string | undefined>).SITE_PASSWORD;
    else process.env.SITE_PASSWORD = ORIGINAL;
  });

  it('allows requests when SITE_PASSWORD is unset', () => {
    expect(requireApiPassword(request())).toBeNull();
  });

  it('returns 401 when SITE_PASSWORD is set and cookie is missing', async () => {
    process.env.SITE_PASSWORD = 'hunter2';

    const res = requireApiPassword(request());

    expect(res?.status).toBe(401);
    await expect(res?.json()).resolves.toEqual({
      error: 'unauthorized: site password required',
    });
  });

  it('allows requests with a valid auth cookie', () => {
    process.env.SITE_PASSWORD = 'hunter2';
    const token = createToken('hunter2');

    expect(requireApiPassword(request(`marstv_auth=${token}`))).toBeNull();
  });
});
