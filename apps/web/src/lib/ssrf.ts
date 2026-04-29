// ============================================================================
// SSRF defense: only allow http(s), reject private / loopback / link-local IPs.
// Used by /api/proxy/m3u8 to sanitize caller-provided URLs.
// ============================================================================

const PRIVATE_V4_PATTERNS: RegExp[] = [
  /^10\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
];

export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.internal') || h.endsWith('.local')) return true;

  // IPv4 literal
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    return PRIVATE_V4_PATTERNS.some((re) => re.test(h));
  }

  // IPv6 literals — be conservative and block bracketed v6 entirely in proxy.
  if (h.startsWith('[') || h.includes(':')) return true;

  return false;
}

export function assertSafeUrl(url: URL): void {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`unsupported protocol: ${url.protocol}`);
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error(`blocked host: ${url.hostname}`);
  }
}
