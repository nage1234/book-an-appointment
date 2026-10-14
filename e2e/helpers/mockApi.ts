import type { Page } from '@playwright/test';

export const CUSTOMER = {
  id: 1,
  name: 'Ravi Kumar',
  email_id: 'ravi@example.com',
  type: 'customer' as const,
};

export async function mockLoginSuccess(page: Page, user: typeof CUSTOMER = CUSTOMER) {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'test.jwt', user }),
    })
  );
}

export async function mockLoginFailure(page: Page, message = 'Invalid email or password.') {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message }),
    })
  );
}

/**
 * Minimal /api/patients + /api/availability so landing on /dashboard after a
 * mocked login doesn't error out fetching data the login spec doesn't care about.
 */
export async function mockDashboardShell(page: Page) {
  await page.route('**/api/patients', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        patients: [{ id: 1, name: CUSTOMER.name, age: null, gender: null, relation: 'Self' }],
      }),
    })
  );
  await page.route('**/api/availability**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ year: 2026, month: 9, daysInMonth: 30, patientId: 1, days: [] }),
    })
  );
}
