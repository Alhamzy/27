import { test, expect } from '@playwright/test';

test('public prayer board loads in RTL with live schedule data', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main')).toHaveAttribute('data-ui-baseline', 'stitch-arabic-public');
  await expect(page.getByText('مسجد الهدى')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'مواقيت اليوم' })).toBeVisible();
  await expect(page.locator('.prayer-row')).toHaveCount(5);
  await expect(page.getByText('الإقامة', { exact: true }).first()).toBeVisible();
});

test('public mosque selector remains available', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('تغيير المسجد')).toBeVisible();
});

test('admin route loads in RTL', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main')).toHaveAttribute('data-ui-baseline', 'stitch-27_2');
});
