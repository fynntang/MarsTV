// Simple client-side auth state for SITE_PASSWORD gate
// In production, this would validate against the API

let _authenticated = true; // Default: no password required

export function isAuthenticated(): boolean {
  return _authenticated;
}

export function setAuthenticated(value: boolean): void {
  _authenticated = value;
}

export async function checkPassword(password: string): Promise<boolean> {
  // In production: POST to API base URL /api/login
  // For now, if API is unreachable, assume no password is set (allow access)
  try {
    const base = 'https://marstv.example.com'; // Will be configurable
    const res = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.status === 200) {
      setAuthenticated(true);
      return true;
    }
    return false;
  } catch {
    // API unreachable -> assume no password gate
    setAuthenticated(true);
    return true;
  }
}
