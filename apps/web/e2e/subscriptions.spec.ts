import type { SubscriptionRecord } from '@marstv/core';
import { expect, test } from '@playwright/test';
import {
  STORAGE_KEYS,
  acceptDisclaimer,
  readLocalStorage,
  seedSubscriptions,
} from './helpers/storage';

function sampleSubscriptions(freshCheck = false): SubscriptionRecord[] {
  const now = Date.now();
  // If freshCheck is true, stamp lastCheckedAt recently so the Home row won't
  // auto-fire /api/subscriptions/check on mount (5-min staleness gate).
  const lastCheckedAt = freshCheck ? now : 0;
  return [
    {
      source: 'cms1',
      sourceName: '源一',
      id: '10',
      title: '三体',
      poster: 'https://example.com/3body.jpg',
      lineIdx: 0,
      lineName: '线路1',
      knownEpisodeCount: 10,
      latestEpisodeCount: 10,
      subscribedAt: now - 86_400_000,
      lastCheckedAt,
    },
    {
      source: 'cms1',
      sourceName: '源一',
      id: '20',
      title: '琅琊榜',
      poster: 'https://example.com/langya.jpg',
      lineIdx: 0,
      lineName: '线路1',
      knownEpisodeCount: 54,
      latestEpisodeCount: 54,
      subscribedAt: now - 86_400_000,
      lastCheckedAt,
    },
  ];
}

test.describe('/subscriptions', () => {
  test.beforeEach(async ({ page }) => {
    await acceptDisclaimer(page);
    await page.route('**/api/image/cms**', (route) => route.fulfill({ status: 404 }));
  });

  test('empty state', async ({ page }) => {
    await page.goto('/subscriptions');
    await expect(page.getByRole('heading', { name: '我的追剧', level: 1 })).toBeVisible();
    await expect(page.getByText(/还没有追剧/)).toBeVisible();
  });

  test('renders seeded subscriptions', async ({ page }) => {
    await seedSubscriptions(page, sampleSubscriptions(true));
    await page.goto('/subscriptions');
    await expect(page.getByText('三体')).toBeVisible();
    await expect(page.getByText('琅琊榜')).toBeVisible();
  });

  test('manual check updates lastCheckedAt via mocked /api/subscriptions/check', async ({
    page,
  }) => {
    await seedSubscriptions(page, sampleSubscriptions(true));
    // Mock the batched check to report "+1 new episode" on 三体.
    await page.route('**/api/subscriptions/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            { source: 'cms1', id: '10', ok: true, episodeCount: 11, lineName: '线路1' },
            { source: 'cms1', id: '20', ok: true, episodeCount: 54, lineName: '线路1' },
          ],
        }),
      });
    });

    await page.goto('/subscriptions');
    await page.getByRole('button', { name: '立即检查更新' }).click();

    // Poll on the thing that should actually change — 三体's episode count
    // going from 10 → 11 per the mocked response. lastCheckedAt was seeded
    // to now, so polling on that would pass immediately without proving the
    // update ran.
    await expect
      .poll(
        async () => {
          const stored = await readLocalStorage<SubscriptionRecord[]>(
            page,
            STORAGE_KEYS.subscriptions,
          );
          return stored?.find((r) => r.id === '10')?.latestEpisodeCount ?? 0;
        },
        { timeout: 5000 },
      )
      .toBe(11);

    const stored = await readLocalStorage<SubscriptionRecord[]>(page, STORAGE_KEYS.subscriptions);
    const threeBody = stored?.find((r) => r.id === '10');
    expect(threeBody?.latestEpisodeCount).toBe(11);
    // lastCheckedAt should have been bumped past the seeded value.
    expect(threeBody?.lastCheckedAt).toBeGreaterThan(Date.now() - 60_000);
  });
});
