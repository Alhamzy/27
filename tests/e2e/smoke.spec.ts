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

test('anonymous users are redirected to the simple admin account screen', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { name: 'حساب مشرف المسجد' })).toBeVisible();
  await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
  await expect(page.getByLabel('كلمة المرور')).toBeVisible();
  await expect(page.getByRole('button', { name: 'إنشاء حساب' })).toBeVisible();
  await expect(page.locator('.admin-prayer-card')).toHaveCount(0);
});

test('invalid admin credentials stay on login with a friendly error', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('البريد الإلكتروني').fill('invalid@example.com');
  await page.getByLabel('كلمة المرور').fill('not-a-real-password');
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).last().click();
  await expect(page.getByRole('alert')).toContainText('تعذر تسجيل الدخول');
});

test('create-account tab uses the same simple email and password form', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByRole('button', { name: 'إنشاء حساب', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'إنشاء الحساب' })).toBeVisible();
  await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
  await expect(page.getByLabel('كلمة المرور')).toBeVisible();
});
