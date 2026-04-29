import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AUTH_COOKIE_NAME,
  createToken,
  isEnabled,
  verifyPassword,
  verifyToken,
} from './site-password';

describe('site-password', () => {
  const saved = process.env.SITE_PASSWORD;
  beforeEach(() => {
    delete process.env.SITE_PASSWORD;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.SITE_PASSWORD;
    else process.env.SITE_PASSWORD = saved;
  });

  it('exports a stable cookie name', () => {
    expect(AUTH_COOKIE_NAME).toBe('marstv_auth');
  });

  describe('when SITE_PASSWORD is unset', () => {
    it('reports disabled', () => {
      expect(isEnabled()).toBe(false);
    });

    it('verifyToken passes through any input (gate disabled)', () => {
      expect(verifyToken(null)).toBe(true);
      expect(verifyToken('')).toBe(true);
      expect(verifyToken('garbage')).toBe(true);
    });

    it('verifyPassword passes through any input (gate disabled)', () => {
      expect(verifyPassword(null)).toBe(true);
      expect(verifyPassword('anything')).toBe(true);
    });
  });

  describe('when SITE_PASSWORD is empty string', () => {
    it('reports disabled', () => {
      process.env.SITE_PASSWORD = '';
      expect(isEnabled()).toBe(false);
    });
  });

  describe('when SITE_PASSWORD is set', () => {
    beforeEach(() => {
      process.env.SITE_PASSWORD = 's3cret';
    });

    it('reports enabled', () => {
      expect(isEnabled()).toBe(true);
    });

    it('createToken produces a 64-char hex string (sha256)', () => {
      const t = createToken('s3cret');
      expect(t).toMatch(/^[0-9a-f]{64}$/);
    });

    it('createToken is deterministic for the same password', () => {
      expect(createToken('s3cret')).toBe(createToken('s3cret'));
    });

    it('createToken changes when the password changes', () => {
      expect(createToken('s3cret')).not.toBe(createToken('other'));
    });

    it('verifyToken accepts a token minted from the current password', () => {
      expect(verifyToken(createToken('s3cret'))).toBe(true);
    });

    it('verifyToken rejects a token minted from a different password', () => {
      expect(verifyToken(createToken('other'))).toBe(false);
    });

    it('verifyToken rejects empty / non-hex / wrong-length input', () => {
      expect(verifyToken(null)).toBe(false);
      expect(verifyToken(undefined)).toBe(false);
      expect(verifyToken('')).toBe(false);
      expect(verifyToken('short')).toBe(false);
      expect(verifyToken('x'.repeat(64))).toBe(false);
    });

    it('verifyPassword accepts exact match, rejects others', () => {
      expect(verifyPassword('s3cret')).toBe(true);
      expect(verifyPassword('S3CRET')).toBe(false);
      expect(verifyPassword('s3cre')).toBe(false);
      expect(verifyPassword('')).toBe(false);
      expect(verifyPassword(null)).toBe(false);
    });

    it('rotating SITE_PASSWORD invalidates previously issued tokens', () => {
      const oldToken = createToken('s3cret');
      process.env.SITE_PASSWORD = 'rotated';
      expect(verifyToken(oldToken)).toBe(false);
      expect(verifyToken(createToken('rotated'))).toBe(true);
    });
  });
});
