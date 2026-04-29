// ============================================================================
// Storage helpers for E2E — thin wrappers around page.addInitScript() that
// seed localStorage before the app mounts. Keys must match the runtime
// owners:
//   - marstv:history / favorites / subscriptions → packages/core/src/storage/local.ts
//   - marstv:disclaimer-accepted-v1              → apps/web/src/components/disclaimer-dialog.tsx
// ============================================================================

import type { FavoriteRecord, PlayRecord, SubscriptionRecord } from '@marstv/core';
import type { Page } from '@playwright/test';

const K_DISCLAIMER = 'marstv:disclaimer-accepted-v1';
const K_HISTORY = 'marstv:history';
const K_FAVORITES = 'marstv:favorites';
const K_SUBSCRIPTIONS = 'marstv:subscriptions';

async function seed(page: Page, key: string, value: string): Promise<void> {
  await page.addInitScript(
    ([k, v]) => {
      try {
        window.localStorage.setItem(k, v);
      } catch {
        // private mode or blocked — not our problem for tests
      }
    },
    [key, value],
  );
}

export async function acceptDisclaimer(page: Page): Promise<void> {
  await seed(page, K_DISCLAIMER, '1');
}

export async function seedFavorites(page: Page, records: FavoriteRecord[]): Promise<void> {
  await seed(page, K_FAVORITES, JSON.stringify(records));
}

export async function seedHistory(page: Page, records: PlayRecord[]): Promise<void> {
  await seed(page, K_HISTORY, JSON.stringify(records));
}

export async function seedSubscriptions(page: Page, records: SubscriptionRecord[]): Promise<void> {
  await seed(page, K_SUBSCRIPTIONS, JSON.stringify(records));
}

export async function readLocalStorage<T = unknown>(page: Page, key: string): Promise<T | null> {
  return page.evaluate((k) => {
    const raw = window.localStorage.getItem(k);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw as unknown;
    }
  }, key) as Promise<T | null>;
}

export const STORAGE_KEYS = {
  disclaimer: K_DISCLAIMER,
  history: K_HISTORY,
  favorites: K_FAVORITES,
  subscriptions: K_SUBSCRIPTIONS,
} as const;
