import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockDashboardShell, mockLoginFailure, mockLoginSuccess } from './helpers/mockApi';

test.describe('Customer login (/login)', () => {
  test('renders the form with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/login');

    await expect(page.getByAltText('Clinic logo')).toBeVisible();
    await expect(page.getByLabel('Enter your email address')).toBeVisible();
    await expect(page.getByLabel('Enter your password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();

    expect(errors).toEqual([]);

    await page.screenshot({
      path: `e2e/screenshots/login-${test.info().project.name}.png`,
      fullPage: true,
    });
  });

  test('wrong credentials show an inline error and stay on /login', async ({ page }) => {
    await mockLoginFailure(page, 'Invalid email or password.');
    await page.goto('/login');

    await page.getByLabel('Enter your email address').fill('ravi@example.com');
    await page.getByLabel('Enter your password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('correct credentials log the customer in and land on /dashboard', async ({ page }) => {
    await mockLoginSuccess(page);
    await mockDashboardShell(page);
    await page.goto('/login');

    await page.getByLabel('Enter your email address').fill('ravi@example.com');
    await page.getByLabel('Enter your password').fill('correct-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('button', { name: 'Open profile menu' })).toBeVisible();
  });

  test('"Forgot password?" navigates to /forgot-password', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test('"Sign up" navigates to /register', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Sign up' }).click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('has no serious/critical accessibility violations', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking).toEqual([]);
  });
});
