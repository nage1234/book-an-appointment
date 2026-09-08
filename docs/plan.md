# Build plan

Order is chosen so each milestone is runnable/demoable on its own.
Principle: no package or abstraction until a milestone actually needs it.

## M0 — Repo boilerplate ✅ DONE

- Nx 21 integrated monorepo (npm), scope `@baa`. No eslint, no test runner.
- `apps/web` — React 19 + Vite + React Router, port 4200. `main.tsx` wires MUI
  `<ThemeProvider>` + `<CssBaseline>` + `<BrowserRouter>`. `app/app.tsx` is a
  `<Routes>` with one placeholder page.
- `apps/api` — Express + esbuild, port 3000. `src/db.ts` (`pg` Pool, SSL,
  `pingDb()`), `src/main.ts` (cors + json + `GET /api/health` → `{status, db}`).
- `libs/shared/types` (`@baa/types`) — `SlotKey`/`SLOT_LABELS`/`SLOT_KEYS`,
  `SlotStatus`, `AppointmentStatus`, `CustomerType`, `AuthUser`.
- `libs/web/ui` (`@baa/ui`) — MUI theme from the `ui-components` skill.
- Runtime deps: web = react, react-dom, react-router-dom, @mui/material,
  @emotion/react, @emotion/styled · api = express, pg, dotenv, cors.
- `.env.example` (`DATABASE_URL`, `PORT`, `WEB_ORIGIN`, `VITE_API_URL`),
  `.gitignore` (`.env`), npm scripts: `dev` / `web` / `api` / `build`.
- Feature libs are **not** pre-generated — create each with the `nx-scaffold`
  skill as its milestone starts.
- **Verified:** `npm run build` (web + api) passes; `tsc --noEmit` clean for web,
  api, types; `nx serve api` + `nx serve web` both boot; `/api/health` responds
  (`db:false` until a real `.env` — expected).

## M1 — Database ✅ DONE

- No migration tool. `db/schema.sql` (idempotent) + `db/apply.mjs`, run with
  `npm run db:schema`. Applied against Supabase 2026-09-07.
- Tables `customers` / `patients` / `appointments` were hand-created; the script
  added `holidays`, the `appointments.patient_id → patients.id` FK, the partial
  unique index `(appointment_date, slot) WHERE status = 'booked'`, and tightened
  nullability / defaults. `db.ts` parses bigint → JS `number`.
- `patients.relation` / `gender` are free text (mockup-driven). No enums; no
  `password_reset_tokens` yet (that's the forgot-password leftover in M2).

## M2 — Authentication ([spec](spec/authentication.md)) — login/register/guard DONE, forgot/reset pending

- `bcryptjs` + `jsonwebtoken` installed. Password base64-decoded server-side.
- `apps/api/src/app/`: `repositories/auth.ts`, `services/auth.ts` (register also
  inserts the `Self` patient), `utils/{jwt,password,requireAuth,httpError}.ts`,
  `controllers/auth.ts`, `routes/auth.ts` at `/api/auth`.
- `apps/web/.../authentication/`: `login.tsx`, `register.tsx`, `useAuth.tsx`
  (AuthContext: `{token,user}` + `login`/`register`/`logout`, `localStorage`
  `baa.auth`), `useApiFetch.ts` (bearer header, 401 → logout + `/login`).
- `<RequireAuth>` guards `/dashboard`. `/admin`, forgot/reset screens not built.
- **Verified:** register → auto Self patient → dashboard; login; 401 → redirect.

## M3 — Dashboard ([spec](spec/dashboard.md)) ✅ DONE (API + UI wired)

- `apps/api/src/app/`: `repositories/{patients,appointments,holidays}.ts`,
  `services/{patients,availability}.ts`, `utils/dates.ts`, controllers + routes
  for `GET/POST /api/patients` and `GET /api/availability?year&month&patientId`.
- Availability computed server-side per patient (blue-first ordering; Sunday /
  holiday / past greying; 3-month horizon check). Built-in `Date`, no dayjs.
- `apps/web/.../dashboard/`: patient / year+month (window-constrained) selects,
  scrollable sticky grid, hover tooltips, `AddPatientDialog` (per mockup),
  loading / error states — wired to `useApiFetch`.
- **Verified via API tests.** Browser visual check pending (Playwright).

## M4 — Booking & cancelling ([spec](spec/booking-and-cancelling.md)) ✅ DONE

- `services/appointments.ts`: `bookAppointment` (past / Sunday / holiday /
  horizon checks, one-active-per-patient, 23505 → 409) and `cancelAppointment`
  (ownership, `status='booked'`, >1h before start). Routes
  `POST /api/appointments` and `POST /api/appointments/:id/cancel`.
- `apps/web/.../dashboard/`: `ConfirmDialog` for book (green cell) and cancel
  (blue cell — completed / <1h / cancellable branches), Snackbar, refetch after
  each mutation.
- **Verified via API tests:** book → blue; second booking same patient → 409;
  cancel → green; unknown / foreign appointment → 404 / 403.

## Browser verification (parallel track — [verification.md](verification.md))

- Standalone Playwright: harness (`playwright.config.ts` + `e2e/`) + `dashboard.spec.ts`
  now; a spec per screen as features settle. Assertions + screenshots + axe, 3 viewports.
- Set up alongside M3, not gated behind M5.

## M5 — Polish

- Loading / empty / error states, buttons disabled while submitting.
- Responsive pass (see `ui-components` skill); a11y on colour (icon/letter, not
  colour alone).
- Add a unit test runner + a few tests (grid colour logic, booking rules, the
  concurrency 409) and eslint if wanted. Tighten Playwright axe gate; consider
  visual-regression baselines now the UI is stable.

## M6 — Admin dashboard ([spec](spec/admin-dashboard.md))

All the spec's open decisions are resolved.

- Add `nodemailer`; add `appointments.created_by` (`customer`/`admin`) column.
- `requireAdmin` middleware; `/api/admin/*` router.
- **Holidays** — CRUD (`holidays` table); availability computation greys holiday
  dates. Adding a holiday cancels every `booked` appointment on that date and
  emails each customer the fixed cancellation message (dev: console transport).
- **Manual booking** — customer search, patient lookup, `POST /api/admin/appointments`
  with `created_by='admin'`, bypassing the per-patient limit / horizon / 1h window
  (slot-taken / Sunday / holiday still block). Admin cancel emails the customer.
- **Metrics** — `GET /api/admin/metrics?period=…`: total appointments for the
  calendar period + an appointments-per-customer table. Plain `COUNT`/`GROUP BY`,
  stat cards + table, no charting library.
- **Dormant customers** — `GET /api/admin/customers/dormant`: `type='customer'`
  accounts with no non-cancelled appointments across their patients.
- `/admin` screen with the four sections; behind an admin route guard.
- **Check:** admin adds a holiday → customer dashboard greys it, its bookings are
  cancelled, those customers get the email; admin books for a chosen patient
  (overriding limits) → shows for that patient and the customer can still cancel
  it; metric numbers + per-customer table render; dormant list is correct.

## Cross-cutting

- `@baa/types` is the single source of truth for `SlotKey`, the slot→time map,
  `SlotStatus`, `AppointmentStatus` — import from both sides.
- Keep apps thin; logic in libs; SQL only in `libs/api/data-access`.

## Decisions

All decisions are resolved — schema.md **Decisions** for M1–M5, and the admin
spec's **Decisions** for M6. Ready to build in order.
