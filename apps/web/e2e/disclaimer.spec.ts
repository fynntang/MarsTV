import { expect, test } from '@playwright/test';
import { STORAGE_KEYS } from './helpers/storage';

test.describe('disclaimer gate', () => {
  test('cold-start home shows the disclaimer dialog', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: '使用声明' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: '我已知晓,进入 MarsTV' })).toBeVisible();
  });

  test('accept dismisses the dialog and persists the flag', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '我已知晓,进入 MarsTV' }).click();
    await expect(page.getByRole('dialog', { name: '使用声明' })).toHaveCount(0);
    const flag = await page.evaluate(
      (k) => window.localStorage.getItem(k),
      STORAGE_KEYS.disclaimer,
    );
    expect(flag).toBe('1');
  });

  test('reloading after accept does not re-prompt', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '我已知晓,进入 MarsTV' }).click();
    await expect(page.getByRole('dialog', { name: '使用声明' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('dialog', { name: '使用声明' })).toHaveCount(0);
  });
});
