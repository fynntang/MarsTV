import type { FavoriteRecord } from '@marstv/core';
import { expect, test } from '@playwright/test';
import { STORAGE_KEYS, acceptDisclaimer, readLocalStorage, seedFavorites } from './helpers/storage';

function sampleFavorites(): FavoriteRecord[] {
  const now = Date.now();
  return [
    {
      source: 'cms1',
      sourceName: '源一',
      id: '100',
      title: '肖申克的救赎',
      poster: 'https://example.com/shawshank.jpg',
      updatedAt: now - 1000,
    },
    {
      source: 'cms1',
      sourceName: '源一',
      id: '200',
      title: '流浪地球',
      poster: 'https://example.com/wandering.jpg',
      updatedAt: now,
    },
  ];
}

test.describe('/favorites', () => {
  test.beforeEach(async ({ page }) => {
    await acceptDisclaimer(page);
    // Poster fetches go through /api/image/cms — stub to 404 so tests don't
    // hit real CDNs; the card still renders without a loaded image.
    await page.route('**/api/image/cms**', (route) => route.fulfill({ status: 404 }));
  });

  test('empty state', async ({ page }) => {
    await page.goto('/favorites');
    await expect(page.getByRole('heading', { name: '我的收藏', level: 1 })).toBeVisible();
    await expect(page.getByText(/还没有收藏/)).toBeVisible();
  });

  test('renders seeded records', async ({ page }) => {
    await seedFavorites(page, sampleFavorites());
    await page.goto('/favorites');
    await expect(page.getByText('肖申克的救赎')).toBeVisible();
    await expect(page.getByText('流浪地球')).toBeVisible();
  });

  test('removing a favorite updates UI and localStorage', async ({ page }) => {
    await seedFavorites(page, sampleFavorites());
    await page.goto('/favorites');
    // The remove button is opacity-0 until hover, but Playwright treats opacity:0
    // as visible for click purposes. Scope by card via the .group marker class.
    const card = page.locator('.group').filter({ hasText: '肖申克的救赎' });
    await card.getByRole('button', { name: '移除' }).click();
    await expect(page.getByText('肖申克的救赎')).toHaveCount(0);
    const stored = await readLocalStorage<FavoriteRecord[]>(page, STORAGE_KEYS.favorites);
    expect(stored).not.toBeNull();
    expect(stored?.map((r) => r.id)).toEqual(['200']);
  });
});
