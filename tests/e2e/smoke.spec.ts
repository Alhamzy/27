import { test, expect } from '@playwright/test';

test('public prayer board loads in RTL', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main')).toHaveAttribute('data-ui-baseline', 'stitch-27_1');
});

test('admin route loads in RTL', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main')).toHaveAttribute('data-ui-baseline', 'stitch-27_2');
});
