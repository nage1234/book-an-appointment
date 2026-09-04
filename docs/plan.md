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
  `in_progress`), `customers`, `patients`, `appointments` (`patient_id` FK +
  partial unique index), `password_reset_tokens`. No `holidays` table — Sunday
  is the only holiday for now (schema.md decision #4). → **`db-migration`** skill.
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

## Cross-cutting

- `@baa/types` is the single source of truth for `SlotKey`, the slot→time map,
  `SlotStatus`, `AppointmentStatus` — import from both sides.
- Keep apps thin; logic in libs; SQL only in `libs/api/data-access`.

## Decisions

All schema.md decisions are resolved (see its **Decisions** section) — nothing
blocking M1 or M4 anymore. Ready to build in order.
