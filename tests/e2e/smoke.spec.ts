import { test, expect } from '@playwright/test';

test('public prayer board loads in RTL with live schedule data', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main')).toHaveAttribute('data-ui-baseline', 'stitch-arabic-public');
  await expect(page.locator('.mosque-picker-row strong')).toHaveText('مسجد الهدى');
  await expect(page.getByRole('heading', { name: 'مواقيت اليوم' })).toBeVisible();
  await expect(page.locator('.prayer-row')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'دخول المشرفين' })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'إدارة مواقيت الإقامة' })).toHaveCount(0);
  await expect(page.locator('.admin-prayer-card')).toHaveCount(0);
});

test('public mosque selector and correction suggestion are available', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('تغيير المسجد')).toBeVisible();
  await page.getByRole('button', { name: 'اقتراح تصحيح' }).click();
  await expect(page.getByRole('dialog', { name: 'اقتراح تصحيح' })).toBeVisible();
  await expect(page.getByText('لن يغيّر مواقيت المسجد مباشرة')).toBeVisible();
});

test('anonymous users are redirected to email OTP admin login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { name: 'دخول مشرف المسجد' })).toBeVisible();
  await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
  await expect(page.getByRole('button', { name: 'إرسال رمز الدخول' })).toBeVisible();
  await expect(page.getByLabel('كلمة المرور')).toHaveCount(0);
  await expect(page.locator('.admin-prayer-card')).toHaveCount(0);
});
