# Build plan

Order is chosen so each milestone is runnable/demoable on its own.

## M0 — Repo boilerplate

- `npx create-nx-workspace@latest book-an-appointment` (integrated, TS).
- Generate apps: `web` (React + Vite), `api` (Express/Node).
- Generate libs (empty shells): `shared/types`, `web/ui`, `web/data-access`,
  `web/auth`, `web/dashboard`, `web/booking`,
  `api/data-access`, `api/auth`, `api/availability`, `api/appointments`.
  → use the **`nx-scaffold`** skill for the exact generator commands + tags.
- Add libraries from [architecture.md](architecture.md).
- `web/ui`: MUI `ThemeProvider` + base theme; `web/data-access`: redux store +
  empty RTK Query `api` + `auth` slice; wire `<Provider>` + `<ThemeProvider>` +
  router into `apps/web`.
- `apps/api`: express app with helmet/cors/pino, `/api/health` route, `pg` Pool
  in `api/data-access` reading `DATABASE_URL`.
- `.env.example`, `.gitignore`, root `README` pointing at `docs/`.
- **Check:** `nx serve web` and `nx serve api` both boot; `/api/health` returns ok;
  `api` logs a successful DB connection to Supabase.

## M1 — Database

- `db/migrations` with node-pg-migrate wired to `DATABASE_URL`.
- Migration 1: enums, `customers`, `appointments` (+ partial unique index),
  `holidays`, `password_reset_tokens`. → **`db-migration`** skill.
- Seed: one admin user, a handful of `holidays` rows for the current year.
- **Check:** `npm run migrate up` applies cleanly against Supabase; tables visible.

## M2 — Authentication ([spec](spec/authentication.md))

- `api/auth`: hashing, jwt, `requireAuth`, `requireAdmin`.
- `api/data-access`: `customersRepo`, `passwordResetRepo`.
- `apps/api/routes/auth.ts`: register / login / me / forgot / reset (+ zod).
- `web/feature-auth`: 4 screens, `react-hook-form` + zod.
- `web/data-access`: auth slice (+ localStorage persist), RTK Query auth endpoints,
  `baseQuery` that injects the bearer token and logs out on 401.
- Route guards + type‑based redirect; `/admin` placeholder page.
- **Check:** register → dashboard; login as admin → `/admin`; forgot/reset via the
  console link; refresh keeps session. → **`add-api-endpoint`** / **`add-web-feature`** skills.

## M3 — Dashboard ([spec](spec/dashboard.md))

- `api/availability`: month grid computation; `GET /api/availability`.
- `web/feature-dashboard`: year/month selects, sticky scrollable grid, cell colours,
  corner indicator + status popover (read‑only for now).
- **Check:** grid renders correct days/weekdays; Sundays + seeded holidays + past
  dates grey; seed a couple of appointments in DB and see red/blue.

## M4 — Booking & cancelling ([spec](spec/booking-and-cancelling.md))

- `api/appointments`: `bookAppointment`, `cancelAppointment`, `listMine`; routes.
- `web/feature-booking`: confirm dialog on green cells, cancel popover on the
  indicator, snackbars, cache invalidation.
- **Check:** book a green slot → turns blue; cancel → turns green; 409 paths show
  clean messages; can't touch others' appointments.

## M5 — Polish

- Loading / empty / error states, form disabling on submit.
- Component tests for the grid colour logic + api tests for booking rules & the
  concurrency 409.
- Basic responsive behaviour; a11y pass on colour (add an icon/letter, not colour alone).

## Cross‑cutting

- `libs/shared/types` is the single source of truth for `SlotKey`, the slot→time
  map, `SlotStatus`, `AppointmentStatus`, and the API DTOs — import it from both sides.
- Keep apps thin; logic in libs; SQL only in repositories; HTTP only in the RTK Query api.

## Blocked on you

Resolve the **Open decisions** in [schema.md](schema.md) before M1 (schema) and M4
(booking rules). M2/M3 don't depend on them.
