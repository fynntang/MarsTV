import { describe, expect, it } from 'vitest';
import { assertSafeUrl, isBlockedHost } from './ssrf';

describe('isBlockedHost', () => {
  it('blocks localhost and *.localhost', () => {
    expect(isBlockedHost('localhost')).toBe(true);
    expect(isBlockedHost('foo.localhost')).toBe(true);
    expect(isBlockedHost('LOCALHOST')).toBe(true);
  });

  it('blocks *.internal and *.local', () => {
    expect(isBlockedHost('api.internal')).toBe(true);
    expect(isBlockedHost('printer.local')).toBe(true);
  });

  it('blocks RFC1918 v4 ranges', () => {
    expect(isBlockedHost('10.0.0.1')).toBe(true);
    expect(isBlockedHost('172.16.0.1')).toBe(true);
    expect(isBlockedHost('172.31.255.255')).toBe(true);
    expect(isBlockedHost('192.168.1.1')).toBe(true);
  });

  it('does NOT block 172.15.x or 172.32.x (just outside RFC1918)', () => {
    expect(isBlockedHost('172.15.0.1')).toBe(false);
    expect(isBlockedHost('172.32.0.1')).toBe(false);
  });

  it('blocks loopback 127.0.0.0/8', () => {
    expect(isBlockedHost('127.0.0.1')).toBe(true);
    expect(isBlockedHost('127.255.255.254')).toBe(true);
  });

  it('blocks 0.0.0.0/8 (wildcard / broken routing)', () => {
    expect(isBlockedHost('0.0.0.0')).toBe(true);
    expect(isBlockedHost('0.1.2.3')).toBe(true);
  });

  it('blocks link-local 169.254.x', () => {
    expect(isBlockedHost('169.254.169.254')).toBe(true); // AWS metadata
  });

  it('blocks CGNAT 100.64.0.0/10', () => {
    expect(isBlockedHost('100.64.0.1')).toBe(true);
    expect(isBlockedHost('100.127.255.254')).toBe(true);
  });

  it('does NOT block 100.63.x (just outside CGNAT)', () => {
    expect(isBlockedHost('100.63.0.1')).toBe(false);
    expect(isBlockedHost('100.128.0.1')).toBe(false);
  });

  it('blocks all IPv6 literals conservatively', () => {
    expect(isBlockedHost('::1')).toBe(true);
    expect(isBlockedHost('[::1]')).toBe(true);
    expect(isBlockedHost('fe80::1')).toBe(true);
    expect(isBlockedHost('2001:db8::1')).toBe(true); // even public v6 blocked
  });

  it('allows ordinary public hostnames', () => {
    expect(isBlockedHost('example.com')).toBe(false);
    expect(isBlockedHost('cdn.apple.com')).toBe(false);
    expect(isBlockedHost('8.8.8.8')).toBe(false);
  });
});

describe('assertSafeUrl', () => {
  it('allows https:', () => {
    expect(() => assertSafeUrl(new URL('https://example.com/foo'))).not.toThrow();
  });

  it('allows http:', () => {
    expect(() => assertSafeUrl(new URL('http://example.com/foo'))).not.toThrow();
  });

  it('rejects file:', () => {
    expect(() => assertSafeUrl(new URL('file:///etc/passwd'))).toThrow(/unsupported protocol/);
  });

  it('rejects ftp:', () => {
    expect(() => assertSafeUrl(new URL('ftp://example.com/x'))).toThrow(/unsupported protocol/);
  });

  it('rejects gopher: (classic SSRF vector)', () => {
    expect(() => assertSafeUrl(new URL('gopher://example.com:70/'))).toThrow(
      /unsupported protocol/,
    );
  });

  it('rejects private IP targets', () => {
    expect(() => assertSafeUrl(new URL('http://10.0.0.1/'))).toThrow(/blocked host/);
    expect(() => assertSafeUrl(new URL('http://169.254.169.254/latest/meta-data'))).toThrow(
      /blocked host/,
    );
  });

  it('rejects localhost regardless of protocol', () => {
    expect(() => assertSafeUrl(new URL('http://localhost:8080/admin'))).toThrow(/blocked host/);
    expect(() => assertSafeUrl(new URL('https://localhost/'))).toThrow(/blocked host/);
  });
});
