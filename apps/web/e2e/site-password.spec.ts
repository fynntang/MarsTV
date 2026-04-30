import { expect, test } from '@playwright/test';
import { acceptDisclaimer } from './helpers/storage';

test.describe('site password gate', () => {
  test('redirects unauthenticated page requests to login with next path', async ({ page }) => {
    await page.goto('/favorites');

    await expect(page).toHaveURL(/\/login\?next=%2Ffavorites$/);
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('rejects unauthenticated protected API requests', async ({ request }) => {
    const res = await request.get('/api/availability?q=test');

    expect(res.status()).toBe(401);
    await expect(await res.json()).toEqual({ error: 'unauthorized: site password required' });
  });

  test('sets auth cookie after login and returns to the requested page', async ({ page }) => {
    await acceptDisclaimer(page);
    await page.goto('/login?next=%2Ffavorites');
    await page.locator('input[type="password"]').fill('e2e-password');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/favorites$/);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);

    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => cookie.name === 'marstv_auth')).toBe(true);
  });

  test('leaves health endpoint public while password gate is enabled', async ({ request }) => {
    const res = await request.get('/api/health/cms');

    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ backend: expect.any(String), sources: [] });
  });
});
