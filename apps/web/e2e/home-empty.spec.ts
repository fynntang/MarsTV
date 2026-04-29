import { expect, test } from '@playwright/test';
import { acceptDisclaimer } from './helpers/storage';

test.describe('home — empty CMS configuration', () => {
  test.beforeEach(async ({ page }) => {
    await acceptDisclaimer(page);
    // Stub douban upstream so server-rendered DoubanRow falls into its
    // fallback branch instead of actually hitting movie.douban.com.
    await page.route('**/movie.douban.com/**', (route) => route.abort());
    await page.route('**/api/availability**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ count: 0, sourceCount: 0 }) }),
    );
  });

  test('hero renders and hero search box is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('火星');
    const input = page.getByPlaceholder('搜索影视剧、番剧、综艺…');
    await expect(input).toBeVisible();
  });

  test('submitting the hero search navigates to /search', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('搜索影视剧、番剧、综艺…');
    await input.fill('inception');
    // The submit button only enables once React state picks up the fill —
    // waiting for it is an implicit hydration gate. Without this, an Enter
    // press can race ahead of hydration and submit the form as plain HTML,
    // which stays on "/" because there's no action attribute.
    await expect(page.getByRole('button', { name: '搜索' })).toBeEnabled();
    await input.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=inception/);
  });
});
