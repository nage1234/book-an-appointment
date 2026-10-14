# Browser verification (Playwright)

How the web UI is checked in a real headless browser — assertions **and**
screenshots. This is the "does it actually render and behave" gate that
type-checking and `nx build` don't give you.

## Choices (finalised)

| Decision | Choice | Why |
| --- | --- | --- |
| Tool | **`@playwright/test`** | Real headless Chromium, built-in runner, auto-waiting, multi-viewport, screenshots, trace viewer. Puppeteer has no runner; `@nx/playwright` adds a generated project we don't need. |
| Integration | **Standalone** — `playwright.config.ts` + `e2e/` at repo root | Matches the flat style the api side already uses. An `nx e2e` target can be added later. |
| API | **Mocked** via `page.route('**/api/**', …)` | UI verification stays independent of Supabase / DB state. A real-API project can be added later. |
| Output | **Assertions + explicit screenshots** | Assertions catch what the eye misses (column counts, no console errors, focus order); screenshots are the visual proof, read against the mockups. |
| Viewports | **360×640 · 768×1024 · 1280×800** | The three sizes the `ui-components` skill already mandates. |
| Accessibility | **`@axe-core/playwright`**, gated on `serious` + `critical` only | The `ui-components` skill requires WAI-ARIA compliance. Minor violations don't block while the UI is still moving. |
| Visual regression (pixel-diff baselines) | **Not yet** | The UI is still in active development — committed baseline screenshots would churn and produce noisy diffs. Revisit at M5 once screens stabilise (`expect(page).toHaveScreenshot()`). |
| Scope now | **Harness + `login.spec.ts`** (built 2026-09-16) | `dashboard.spec.ts` / `register` / admin specs are added as those features settle. |

## One-time setup

```bash
npm i -D @playwright/test @axe-core/playwright
npm run e2e:install        # downloads Chromium (~150 MB) to ~/Library/Caches/ms-playwright, not node_modules
```

`.prototools` pins Node, so Playwright's `webServer` (`npm run web`) starts cleanly.

## Layout

```
playwright.config.ts
e2e/
├── login.spec.ts         # built 2026-09-16
├── dashboard.spec.ts     # not yet built
├── helpers/
│   ├── mockApi.ts        # page.route handlers for /api/auth/* + a minimal dashboard shell
│   └── session.ts        # seeds localStorage `baa.auth` (for when a route guard lands)
└── screenshots/          # git-ignored; regenerated each run
```

### `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:4200';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'on-first-retry' },
  projects: [
    { name: 'mobile',  use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 640 } } },
    { name: 'tablet',  use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run web',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Real Chromium at three fixed viewport sizes — predictable, matches the skill's numbers.

### `e2e/helpers/mockApi.ts` and `e2e/helpers/session.ts`

Actual implementation, kept in sync with the code rather than duplicated here:
- `mockApi.ts` — `CUSTOMER` fixture, `mockLoginSuccess` / `mockLoginFailure` for
  `**/api/auth/login`, and `mockDashboardShell` (minimal `**/api/patients` +
  `**/api/availability**`) so a mocked login's redirect to `/dashboard` doesn't
  error trying to fetch real data.
- `session.ts` — `seedSession(page)`, seeds `localStorage['baa.auth']` via
  `page.addInitScript` so a spec can land on a protected route without going
  through the login form. Not used by `login.spec.ts` itself (that spec *is*
  the login form); for `dashboard.spec.ts` and later specs.

## What `login.spec.ts` checks (built 2026-09-16)

Runs on all three viewport projects — 6 tests × 3 = 18.

- Renders: logo, both labelled fields (`getByLabel`), "Forgot password?" link,
  "Sign in" button, "Sign up" link — **zero `console.error`** during load —
  plus a screenshot (`e2e/screenshots/login-<project>.png`).
- Wrong credentials (mocked `401`) → the server's error message shown inline,
  still on `/login`.
- Correct credentials (mocked `200` + `mockDashboardShell`) → lands on
  `/dashboard` (profile menu visible).
- "Forgot password?" → `/forgot-password`; "Sign up" → `/register`.
- `AxeBuilder(page).analyze()` → no `serious`/`critical` violations.
  **Currently 3 failing** (one per viewport) — see the `ui-components` skill's
  Buttons section: `#54A0D6` white-on-blue and blue-on-white both measure
  2.84:1 against a required 4.5:1. Left failing on purpose (2026-09-16) —
  fixing it means either darkening the brand blue or explicitly accepting the
  violation, both decisions for the user, not something to quietly patch
  around in the test.

## What `dashboard.spec.ts` checks (not yet built)

Runs on all three viewport projects.

**Renders**
- Heading "Appointment Booking System"
- "Appointment for" label + select; "Choose the year" + "Choose the month"
- "Availability Grid" heading; the grid; the note line
- All four legend labels (`Available`, `Booked (Others)`, `Booked (Self)`, `Holiday / Unavailable`)
- **Zero `console.error`** during load

**Grid behaviour**
- Day-header count == days in the selected month (Sept 2026 → 30)
- Switch month to February → count becomes 28
- The sticky "Time / Day" cell stays in the viewport after scrolling the grid container right
- `document.documentElement.scrollWidth <= clientWidth` — the **page body never scrolls sideways** (grid scrolls inside its own container)

**Interactions**
- Open the patient select → "Ravi Kumar" and "+ Add new patient" are listed
- Open the profile menu → click "Sign out" → URL is `/login`

**Accessibility**
- `AxeBuilder(page).analyze()` → no `serious`/`critical` violations

**Screenshot**
- `page.screenshot({ path: 'e2e/screenshots/dashboard-<project>.png', fullPage: true })`

## Component changes this will force

Writing the spec surfaces gaps against the `ui-components` skill's a11y rule —
fix these in `dashboard.tsx` / `AvailabilityGrid.tsx` as part of wiring the spec:

- **Avatar is a clickable `<div>`** — no keyboard access, no accessible name. Make
  it an `IconButton` with `aria-label="Open profile menu"` + `aria-haspopup="menu"`.
  (axe flags this; the "sign out" test needs a nameable control.)
- **Grid scroll container** needs `data-testid="availability-grid-scroll"` so the
  sticky-column and no-body-scroll tests target it reliably.
- **Day-header cells** need a stable hook — `role="columnheader"` or a `data-testid`
  — for the column-count assertion.
- **MUI `Select` labelling** — confirm `FormLabel htmlFor` + Select `id` gives a
  working accessible name (`getByLabel`), else add `aria-label` / `inputProps`.

## Running it

```bash
npm run e2e            # headless, all 3 viewports
npm run e2e:ui         # interactive (local debugging)
npm run e2e:report     # open the last HTML report
```

Then read `e2e/screenshots/dashboard-*.png` and eyeball against
`docs/mockups/book_appointment.png`.

## Scripts / ignores

`package.json`:
```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui",
"e2e:report": "playwright show-report",
"e2e:install": "playwright install chromium"
```

`.gitignore`:
```
/test-results
/playwright-report
/e2e/screenshots
/blob-report
/playwright/.cache
```

## CI (not set up)

When added: `npx playwright install --with-deps chromium` then `npm run e2e`.
The `webServer` block starts the app automatically. Publish `playwright-report/`
and `e2e/screenshots/` as build artifacts.

## Roadmap

- **Done (2026-09-16)** — harness + `login.spec.ts`.
- **Next** — `dashboard.spec.ts` (+ the component a11y fixes below), then
  `register.spec.ts`, `forgotPassword.spec.ts`, admin specs.
- **M3** — add `/api/availability` + `/api/patients` mocks; assert cell colours,
  patient-switch refetch, holiday/Sunday greying.
- **M5** — tighten axe to all violations; reconsider pixel-diff visual regression
  (`toHaveScreenshot`) now that screens are stable.
- **Later** — a `.claude/skills/verify-ui/` skill wrapping "run e2e → read
  screenshots → report", so the check is invoked consistently.
