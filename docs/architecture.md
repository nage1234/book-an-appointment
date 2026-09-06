# Architecture

Guiding rule: **install a package only when a feature actually needs it.** The
boilerplate ships with the smallest set that builds and runs. Everything else is
added at the milestone that needs it.

## Tech stack

| Layer | Choice |
| --- | --- |
| Monorepo | **Nx 21** (integrated, npm). Import alias `@baa/<name>`. |
| Frontend | **React 19** + **React Router** + **Vite**. State: plain `useState`/`useReducer` in components, plus one **`AuthContext`** (React Context, built into React) at the app root holding the logged-in session. Deliberately no Redux/RTK — the app's global state is just "who's logged in", which doesn't justify that boilerplate. Add a state library later only if something genuinely outgrows this. |
| UI kit | **Material UI** — `@mui/material @emotion/react @emotion/styled`. Styling via `sx` / `styled`. Design tokens live in the shared theme (`@baa/ui`) — see the `ui-components` skill. |
| Backend | **Node.js** + **Express** (TypeScript, built with esbuild). |
| DB | **Supabase Postgres**, connected directly from Node with the `pg` driver over the Direct Connection string. No Supabase SDK. |
| Auth | Planned: JWT + bcrypt (added in M2). |
| Migrations | Planned: `node-pg-migrate` (added in M1). |
| Lint / tests | **None yet** — add when the code is worth guarding. |

## Nx monorepo layout

Legend: ✅ exists now · ▫ created later, per milestone, via the `nx-scaffold` skill.

```
book-an-appointment/
├── apps/
│   ├── web/                     # ✅ React 19 + Vite, port 4200
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx         # ✅ ThemeProvider + CssBaseline + BrowserRouter
│   │       └── app/
│   │           ├── app.tsx          # ✅ <Routes> — mount feature routes here
│   │           ├── AuthContext.tsx  # ▫ session (token, user) + useAuth() — M2
│   │           └── apiFetch.ts      # ▫ shared fetch wrapper (bearer header, 401 -> logout) — M2
│   └── api/                     # ✅ Express, port 3000
│       └── src/
│           ├── main.ts          # ✅ cors + json + GET /api/health
│           ├── db.ts            # ✅ pg Pool + pingDb()
│           └── routes/          # ▫ thin route files -> call lib services
├── libs/
│   ├── shared/
│   │   └── types/               # ✅ @baa/types — SlotKey, SlotStatus, AppointmentStatus, AuthUser…
│   ├── web/
│   │   ├── ui/                  # ✅ @baa/ui — MUI theme
│   │   ├── auth/                # ▫ login, register, forgot / reset password
│   │   ├── dashboard/           # ▫ patient/year/month selectors, add-patient dialog, calendar table
│   │   ├── booking/             # ▫ book dialog, cancel popover, status popover
│   │   └── admin/               # ▫ M6 — holidays, manual booking, metrics, dormant customers
│   └── api/
│       ├── data-access/         # ▫ pg queries (customers, patients, appointments, holidays)
│       ├── auth/                # ▫ hashing, jwt, requireAuth / requireAdmin
│       ├── availability/        # ▫ builds the month availability grid
│       ├── appointments/        # ▫ book / cancel / list-mine + rules
│       └── admin/               # ▫ M6 — holiday CRUD, manual booking, metrics, reports
├── db/migrations/               # ▫ node-pg-migrate (M1)
├── docs/
└── .claude/skills/
```

**Rule of thumb:** apps stay thin (wiring only); logic lives in `libs`. API
routes don't run SQL directly — they call `libs/api/data-access`.

## Dependencies

### Installed now

**web:** `react`, `react-dom`, `react-router-dom`, `@mui/material`, `@emotion/react`, `@emotion/styled`
**api:** `express`, `pg`, `dotenv`, `cors`
**build (dev):** `nx` + `@nx/{react,vite,node,esbuild,js,web,workspace}`, `vite`, `@vitejs/plugin-react`, `esbuild`, `typescript`, `tslib`, `@types/*`

### Add when the milestone needs it

| Package | When | For |
| --- | --- | --- |
| `node-pg-migrate` | M1 | schema migrations |
| `bcryptjs`, `jsonwebtoken` | M2 | password hashing, access tokens |
| `zod` | M2 | request body validation (only where it pays off) |
| `dayjs` | M3 | month length / weekday / Sunday detection (web + api) |
| `nodemailer` | M6 | admin-cancellation emails (dev: console transport) |
| `@mui/x-charts` | only if the admin metrics ever need graphs (not planned) | — |
| a state or data-fetching lib | only if plain React state + `fetch` genuinely stops scaling | — |
| eslint / a test runner | when you want them | — |

## Environment variables

| Var | Used by | Example |
| --- | --- | --- |
| `DATABASE_URL` | api (+ migrations later) | `postgresql://postgres:<pw>@db.adtzwdoturygbvjmlizv.supabase.co:5432/postgres` |
| `PORT` | api | `3000` |
| `WEB_ORIGIN` | api (CORS) | `http://localhost:4200` |
| `VITE_API_URL` | web | `http://localhost:3000/api` |
| `JWT_SECRET` | api | added in M2 |
| `SMTP_*` | api | added in M6 for cancellation emails; unset in dev → log to console |

`.env` is git-ignored; `.env.example` is committed.

## API conventions

- Base path `/api`. JSON only. Auth (from M2) via `Authorization: Bearer <token>`.
- Success: `200/201` with the resource. Error: a 4xx/5xx status with `{ error: { message } }`.
- Dates in payloads are ISO `YYYY-MM-DD`; slots are `SlotKey` values (see schema.md).
