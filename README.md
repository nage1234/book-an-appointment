# book-an-appointment

A booking application for a psychiatric clinic: customers register, manage the
people they book on behalf of (themselves, a parent, a spouse, a child, …), and
book/cancel one-hour consultation slots on a month calendar. Admins have a
separate login. Built as a monorepo with a documented spec, schema, and
milestone plan before any feature code — see [Documentation](#documentation).

## What it does (use cases)

**Authentication**
- A customer can register (email, password, name) and is logged straight in.
- A customer can log in / log out; a session survives a page refresh.
- A customer can request a password-reset link and set a new password.
- An admin logs in through the same screen and lands on the `/admin` dashboard.
- Registering a customer auto-creates a "Self" patient, so booking works immediately.

**Patients** — one account, multiple people
- A customer can add multiple **patients** under their account — self, mother,
  father, spouse, child, sibling, friend, etc. — each with a name, age, gender,
  and relation.
- Every booking is made *for* a specific patient, picked from a selector.

**Availability dashboard**
- Pick a patient, a year, and a month (bookable up to 3 months ahead) to see a
  horizontally-scrollable calendar: one column per day, 6 fixed one-hour slots
  (10–1, 2–5) per day as rows.
- Each slot is colour-coded: **green** = available, **blue** = booked for the
  selected patient, **red** = booked for someone else, **grey** = Sunday, an
  admin-set holiday, or a past slot.
- A small indicator on the selected patient's own bookings opens a popover with
  the appointment's status.

**Booking & cancelling**
- Click an available slot → confirm in a dialog → it's booked for the selected
  patient.
- A patient can hold only **one active appointment at a time** (across any
  date); a customer's *different* patients aren't limited by each other.
- Cancel a booked appointment up to 1 hour before it starts, from the same
  status popover.
- A completed appointment (its slot's end time has passed) is shown as
  `Completed` automatically — no admin step, no background job.

**Admin dashboard** (`/admin`)
- Set and remove **holidays** — a holiday greys the date out for every customer,
  cancels any bookings on it, and emails those customers.
- **Book manually** for any customer's patient (phone bookings), overriding the
  usual limits.
- **Metrics** — total appointments per calendar month/year, and an
  appointments-per-customer breakdown.
- **Dormant customers** — accounts that registered but never booked.

Full behavioural detail, including every edge case and error response, is
written up per feature in [docs/spec/](docs/spec/).

## Tech stack, and why

| Layer | Choice | Why |
| --- | --- | --- |
| Monorepo | **Nx 21** | One repo for the React app, the Express API, and the types shared between them — the slot/status/patient enums are defined once and imported both sides, so the API and UI can't silently drift apart. |
| Frontend | **React 19 + Vite + React Router** | A plain client-rendered SPA sitting behind its own API has no SEO/SSR need, so a full framework (Next.js etc.) would add build complexity this app doesn't use. Vite keeps the dev loop fast with almost no config. |
| UI kit | **Material UI** | Accessible, ready-made `Select`/`Dialog`/`Popover`/`Snackbar` components mean effort goes into the booking logic, not building form controls from scratch. Design tokens (button colours, typography, links) live in one shared theme file, so the look stays consistent everywhere and is trivial to retheme later. |
| Client state | **React Context (`AuthContext`)** — *not Redux* | The only truly global piece of state in this app is "who's logged in." Redux/Redux Toolkit solves problems this app doesn't have — large normalized state, complex cross-slice updates, time-travel debugging. One Context + a `useAuth()` hook does the job with zero extra dependencies and far less boilerplate to read through. |
| Data fetching | **Plain `fetch`, refetch-after-mutate** — *not TanStack/RTK Query* | The data needs are small: a month of availability, a patient list, and a handful of mutations (book, cancel, add patient). "Re-run the GET after a successful POST" is one line and easy to reason about; a caching/invalidation layer earns its complexity at a scale this app isn't at. |
| Backend | **Node.js + Express** | A handful of resources (auth, patients, availability, appointments) don't need a DI/module framework like Nest — Express stays out of the way. |
| Database | **Supabase Postgres, via the plain `pg` driver** — *not the Supabase SDK* | Connecting with the standard driver over the direct connection string keeps the backend in portable SQL/Postgres, not coupled to a vendor client library — the same code would work unchanged against any Postgres instance. |
| IDs | **`bigint` identity, not UUID** | Simpler to read and debug (sequential, legible in logs and DB browsing); this app has no multi-writer/distributed-id-generation scenario that would justify UUIDs. |
| Appointment lifecycle | **Derived `completed` status, no cron** | Slot times are fixed and known in advance, so "has this booked slot's end time passed?" is computed on every read instead of needing a background job to flip a status column — one less moving part to run and monitor. |
| Cancellation | **Soft-cancel (`status` flag), not delete** | Keeps appointment history (for the "Completed" view) without a separate audit table. |
| Lint / tests | **Deliberately not set up yet** | Added at the polish milestone once there's enough real feature code for lint rules and tests to guard something — not skipped, just sequenced last. See [docs/plan.md](docs/plan.md) M5. |

Every one of these is written up in more detail — including the alternatives
considered — in [docs/architecture.md](docs/architecture.md).

## Project status

Spec-complete, boilerplate built, features not yet implemented. See
[docs/plan.md](docs/plan.md) for the exact milestone breakdown:

- ✅ **M0** — Nx workspace, React/Express boilerplate, MUI theme, DB connectivity
- 🔨 **M1** — database migrations (customers, patients, appointments, holidays, password resets)
- 🔨 **M2** — authentication *(login + register built; forgot/reset pending)*
- 🔨 **M3** — availability dashboard *(static UI shell built; selects, grid, patient picker not yet wired to data)*
- ⏭ **M4** — booking & cancelling
- ⏭ **M5** — polish, lint, tests
- ⏭ **M6** — admin dashboard (holidays, manual booking, metrics, dormant customers)

## Quick start

Nx 21 monorepo (npm). Requires Node ≥ 22.12 (developed on Node 26).

```bash
npm ci
cp .env.example .env          # fill in the Supabase DATABASE_URL

npm run dev                   # web on :4200, api on :3000
# or individually: 
npm run web                   # run the web UI application

npm run api                   # run the backend node application

npm run build                 # build web + api
```

Check API + DB wiring: `curl localhost:3000/api/health` → `{"status":"ok","db":true}`
once `.env` has a valid `DATABASE_URL` (before that: `{"status":"degraded","db":false}`).

> Node is pinned in `.prototools` (`node = "26.7.0"`). If you use the `proto`
> toolchain, `proto use` in the repo installs it. If `npx nx` still hits a
> `proto::commands::run::fallback_loop`, run once with a clean PATH:
> `export PATH="$HOME/.proto/tools/node/26.7.0/bin:/usr/bin:/bin:/usr/sbin:/sbin"`.

### Layout

- `apps/web` — React 19 + Vite + React Router + MUI
- `apps/api` — Express + `pg` (Supabase direct connection)
- `libs/shared/types` (`@baa/types`) — enums shared by both
- `libs/web/ui` (`@baa/ui`) — MUI theme

## Documentation

See [docs/](docs/README.md):

- [Architecture](docs/architecture.md) — full stack rationale, Nx layout, what's installed vs added-per-milestone
- [Schema](docs/schema.md) — database schema, all design decisions and their reasoning
- [Plan](docs/plan.md) — build milestones
- Specs: [Authentication](docs/spec/authentication.md) · [Dashboard](docs/spec/dashboard.md) · [Booking & cancelling](docs/spec/booking-and-cancelling.md)

Repeatable dev workflows are in [.claude/skills/](.claude/skills/): `nx-scaffold`, `add-api-endpoint`, `add-web-feature`, `db-migration`, `ui-components`, `commit-changes`.
