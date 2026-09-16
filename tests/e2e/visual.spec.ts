import { test, expect } from '@playwright/test';

test('@visual public board', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('public-board.png', { fullPage: true, animations: 'disabled' });
});

test('@visual admin board', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveScreenshot('admin-board.png', { fullPage: true, animations: 'disabled' });
});
