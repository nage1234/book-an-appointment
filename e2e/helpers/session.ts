import type { Page } from '@playwright/test';
import { CUSTOMER } from './mockApi';

/** Land on a protected route without going through the login form. */
export async function seedSession(page: Page) {
  await page.addInitScript(
    ([token, user]) => {
      localStorage.setItem('baa.auth', JSON.stringify({ token, user }));
    },
    ['test.jwt', CUSTOMER] as const
  );
}
