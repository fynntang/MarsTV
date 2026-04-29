import { expect, test } from '@playwright/test';
import { acceptDisclaimer } from './helpers/storage';

test.describe('/search — empty-source behavior', () => {
  test.beforeEach(async ({ page }) => {
    await acceptDisclaimer(page);
  });

  // With CMS_SOURCES_JSON=[] the page short-circuits into the "no CMS sources"
  // branch regardless of q. We assert that banner + the ever-present search
  // box both render — that's the deterministic surface we have without seeding
  // a fake CMS.
  test('no q → renders the search box and the "尚未配置 CMS 源" banner', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByPlaceholder('搜索影视剧、番剧、综艺…')).toBeVisible();
    await expect(page.getByRole('heading', { name: '尚未配置 CMS 源' })).toBeVisible();
  });

  test('with q and no CMS sources → still shows the "尚未配置 CMS 源" banner', async ({ page }) => {
    await page.goto('/search?q=test');
    await expect(page.getByRole('heading', { name: '尚未配置 CMS 源' })).toBeVisible();
  });
});
