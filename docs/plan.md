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

## M1 — Database

- Add `node-pg-migrate`; `db/migrations` wired to `DATABASE_URL`.
- Migration 1: enums (`appointment_status` = `booked`/`cancelled` only — no
  `in_progress`; `created_by` = `customer`/`admin`), `customers`, `patients`,
  `appointments` (`patient_id` FK, `created_by` default `customer`, partial
  unique index), `holidays`, `password_reset_tokens`. → **`db-migration`** skill.
- Seed: one admin user.
- **Check:** `npm run migrate up` applies cleanly against Supabase.

## M2 — Authentication ([spec](spec/authentication.md))

- Add `bcryptjs`, `jsonwebtoken` (+ `zod` if it earns its place).
- `libs/api/data-access`: customer + reset-token queries; registration also
  inserts the auto-created `self` patient (same transaction).
- `libs/api/auth`: hashing, jwt, `requireAuth`, `requireAdmin`.
- `apps/api/src/routes/auth.ts`: register / login / me / forgot / reset.
- `libs/web/auth`: the 4 screens (plain controlled inputs + React state).
- `apps/web/src/app/AuthContext.tsx`: React Context holding `{ token, user }`
  (mirrored to `localStorage` key `baa.auth`), a `login()`/`logout()` pair, and
  a `useAuth()` hook. Provider wraps `<App/>` in `main.tsx`, inside `<BrowserRouter>`.
- `apps/web/src/app/apiFetch.ts`: the one shared `fetch` wrapper — prefixes
  `VITE_API_URL`, adds `Authorization: Bearer` from `useAuth()`'s token, and
  calls `logout()` + redirects to `/login` on `401`. No Redux/RTK — Context
  covers this app's one piece of global state.
- Route guards (`<RequireAuth>`, `<RequireAuth role="admin">`) read `useAuth()`;
  type‑based redirect; `/admin` placeholder page ("Welcome Admin").
- **Check:** register → dashboard; admin login → `/admin` shows "Welcome Admin";
  forgot/reset via the console link; refresh keeps the session. →
  **`add-api-endpoint`** / **`add-web-feature`**.

## M3 — Dashboard ([spec](spec/dashboard.md))

- Add `dayjs` (web + api).
- `libs/api/data-access`: patient queries; routes `GET/POST /api/patients`.
- `libs/api/availability`: month grid computation, keyed by `patientId`;
  `GET /api/availability?year&month&patientId`.
- `libs/web/dashboard`: patient select (+ "Add a new patient" dialog), year/month
  selects constrained to the 3-month booking horizon, sticky scrollable grid,
  cell colours, corner indicator + status popover (read-only for now).
- **Check:** new customer sees their auto-created "Self" patient pre-selected;
  adding a patient shows it in the select; correct day count + weekdays; Sundays
  / past dates grey (except the selected patient's own past bookings, shown
  `Completed`); seed appointments in the DB and see red/blue per patient; Year/
  Month options never exceed the 3-month horizon.

## M4 — Booking & cancelling ([spec](spec/booking-and-cancelling.md))

- `libs/api/appointments`: `bookAppointment(patientId, ...)`, `cancelAppointment`,
  `listMine(patientId)` + routes.
- `libs/web/booking`: confirm dialog on green cells (booking for the selected
  patient), cancel popover on the indicator, snackbars, refetch after mutate.
- **Check:** book green → blue for the selected patient; a patient with an
  active booking gets `409` trying to book another; cancel → green if more than
  1 hour before start, blocked (`409`) inside that window; can't touch another
  customer's patients.

## M5 — Polish

- Loading / empty / error states, buttons disabled while submitting.
- Responsive pass (see `ui-components` skill); a11y on colour (icon/letter, not
  colour alone).
- Add a test runner + a few tests (grid colour logic, booking rules, the
  concurrency 409) and eslint if wanted.

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
