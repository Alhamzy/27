import { test, expect } from '@playwright/test';

async function assertPublic(page: import('@playwright/test').Page) {
  await expect(page.locator('main')).toHaveAttribute('data-ui-baseline', 'stitch-arabic-public');
  await expect(page.getByRole('heading', { name: 'مواقيت اليوم' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'إدارة مواقيت الإقامة' })).toHaveCount(0);
  await expect(page.locator('.prayer-row')).toHaveCount(5);
}

async function assertAdmin(page: import('@playwright/test').Page) {
  await expect(page.locator('main')).toHaveAttribute('data-ui-baseline', 'stitch-27_2');
  await expect(page.getByRole('heading', { name: 'إدارة مواقيت الإقامة' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'مواقيت اليوم' })).toHaveCount(0);
  await expect(page.locator('.admin-prayer-card')).toHaveCount(5);
}

test('@visual public board visual evidence', async ({ page }, testInfo) => {
  await page.goto('/');
  await assertPublic(page);
  await page.screenshot({
    path: testInfo.outputPath(`public-${testInfo.project.name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
});

test('@visual admin board visual evidence', async ({ page }, testInfo) => {
  await page.goto('/admin');
  await assertAdmin(page);
  await page.screenshot({
    path: testInfo.outputPath(`admin-${testInfo.project.name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
});
