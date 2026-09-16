import { test, expect } from '@playwright/test';

test('public prayer board loads in RTL with live schedule data', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main')).toHaveAttribute('data-ui-baseline', 'stitch-arabic-public');
  await expect(page.locator('.mosque-picker-row strong')).toHaveText('مسجد الهدى');
  await expect(page.getByRole('heading', { name: 'مواقيت اليوم' })).toBeVisible();
  await expect(page.locator('.prayer-row')).toHaveCount(5);

  // Route guard: the public landing page must never render the admin editor.
  await expect(page.getByRole('heading', { name: 'إدارة مواقيت الإقامة' })).toHaveCount(0);
  await expect(page.locator('.admin-prayer-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '+ إضافة مسجد' })).toHaveCount(0);
});

test('public mosque selector remains available', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('تغيير المسجد')).toBeVisible();
});

test('admin route exposes five prayer editors and mosque controls', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main')).toHaveAttribute('data-ui-baseline', 'stitch-27_2');
  await expect(page.getByRole('heading', { name: 'إدارة مواقيت الإقامة' })).toBeVisible();
  await expect(page.locator('.admin-prayer-card')).toHaveCount(5);
  await expect(page.getByRole('button', { name: '+ إضافة مسجد' })).toBeVisible();
  await expect(page.locator('.mosque-admin-select')).toBeVisible();

  // Route guard: the admin screen is distinct from the public landing page.
  await expect(page.getByRole('heading', { name: 'مواقيت اليوم' })).toHaveCount(0);
});

test('admin can adjust an offset and switch to fixed time in the draft UI', async ({ page }) => {
  await page.goto('/admin');
  const fajrOffset = page.getByLabel('دقائق صلاة الفجر');
  await expect(fajrOffset).toHaveValue('25');
  await fajrOffset.fill('20');
  await expect(fajrOffset).toHaveValue('20');
  await page.locator('.admin-prayer-card').first().getByRole('button', { name: 'وقت ثابت' }).click();
  await expect(page.locator('.admin-prayer-card').first().locator('input[type="time"]')).toBeVisible();
});
