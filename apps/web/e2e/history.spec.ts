import type { PlayRecord } from '@marstv/core';
import { expect, test } from '@playwright/test';
import { STORAGE_KEYS, acceptDisclaimer, readLocalStorage, seedHistory } from './helpers/storage';

function sampleHistory(): PlayRecord[] {
  const now = Date.now();
  return [
    {
      source: 'cms1',
      sourceName: '源一',
      id: '1',
      title: '凡人修仙传',
      poster: 'https://example.com/fanren.jpg',
      lineIdx: 0,
      lineName: '线路1',
      epIdx: 4,
      positionSec: 600,
      durationSec: 1500,
      updatedAt: now,
    },
    {
      source: 'cms1',
      sourceName: '源一',
      id: '2',
      title: '斗罗大陆',
      poster: 'https://example.com/douluo.jpg',
      lineIdx: 0,
      lineName: '线路1',
      epIdx: 1,
      positionSec: 120,
      durationSec: 1200,
      updatedAt: now - 1000,
    },
  ];
}

test.describe('/history', () => {
  test.beforeEach(async ({ page }) => {
    await acceptDisclaimer(page);
    await page.route('**/api/image/cms**', (route) => route.fulfill({ status: 404 }));
  });

  test('empty state', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByRole('heading', { name: '观看历史', level: 1 })).toBeVisible();
    await expect(page.getByText(/还没有观看记录/)).toBeVisible();
  });

  test('renders seeded history with titles', async ({ page }) => {
    await seedHistory(page, sampleHistory());
    await page.goto('/history');
    await expect(page.getByText('凡人修仙传')).toBeVisible();
    await expect(page.getByText('斗罗大陆')).toBeVisible();
  });

  test('removing a record drops it from the grid + storage', async ({ page }) => {
    await seedHistory(page, sampleHistory());
    await page.goto('/history');
    const card = page.locator('.group').filter({ hasText: '斗罗大陆' });
    await card.getByRole('button', { name: '移除' }).click();
    await expect(page.getByText('斗罗大陆')).toHaveCount(0);
    const stored = await readLocalStorage<PlayRecord[]>(page, STORAGE_KEYS.history);
    expect(stored?.map((r) => r.id)).toEqual(['1']);
  });
});
