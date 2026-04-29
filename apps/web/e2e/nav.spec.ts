import { expect, test } from '@playwright/test';
import { acceptDisclaimer } from './helpers/storage';

// Nav bar lives in apps/web/src/app/layout.tsx — assert both the URL and the
// destination page's h1 to make sure the link actually lands on the right page.
test.describe('header navigation', () => {
  test.beforeEach(async ({ page }) => {
    await acceptDisclaimer(page);
    // Block douban upstream so the home hero paints immediately.
    await page.route('**/movie.douban.com/**', (route) => route.abort());
    await page.route('**/api/availability**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ count: 0, sourceCount: 0 }) }),
    );
  });

  test('home → 收藏', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '收藏', exact: true }).first().click();
    await expect(page).toHaveURL(/\/favorites$/);
    await expect(page.getByRole('heading', { name: '我的收藏', level: 1 })).toBeVisible();
  });

  test('home → 历史', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '历史', exact: true }).first().click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByRole('heading', { name: '观看历史', level: 1 })).toBeVisible();
  });

  test('home → 追剧', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '追剧', exact: true }).first().click();
    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByRole('heading', { name: '我的追剧', level: 1 })).toBeVisible();
  });

  test('home → 豆瓣', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '豆瓣', exact: true }).first().click();
    await expect(page).toHaveURL(/\/douban/);
    await expect(page.getByRole('heading', { name: '豆瓣片单', level: 1 })).toBeVisible();
  });
});
