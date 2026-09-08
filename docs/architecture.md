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

## Layout (as built)

The `libs/api/*` / `libs/web/feature-*` split the earlier drafts imagined was
dropped — features live flat inside each app. Only genuinely shared code is a lib
(`@baa/types`, `@baa/ui`). Legend: ✅ built · ▫ planned.

```
book-an-appointment/
├── apps/
│   ├── web/  (React 19 + Vite + React Router, :4200)
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx                     # ✅ ThemeProvider + CssBaseline + BrowserRouter + AuthProvider
│   │       └── app/
│   │           ├── app.tsx                  # ✅ <Routes> + <RequireAuth>
│   │           └── pages/
│   │               ├── authentication/      # ✅ login.tsx, register.tsx, types.ts,
│   │               │                        #    useAuth.tsx (AuthContext), useApiFetch.ts
│   │               └── dashboard/            # ✅ dashboard.tsx, AvailabilityGrid.tsx,
│   │                                        #    AddPatientDialog.tsx, ConfirmDialog.tsx, helpers.ts
│   └── api/  (Express + esbuild, :3000)
│       └── src/
│           ├── main.ts                      # ✅ cors + json + route mounting + GET /api/health
│           ├── db.ts                        # ✅ pg Pool (bigint→number) + pingDb()
│           └── app/
│               ├── routes/                  # ✅ auth, patients, availability, appointments (thin; requireAuth)
│               ├── controllers/             # ✅ HTTP in/out only
│               ├── services/                # ✅ business rules — no req/res, no SQL
│               ├── repositories/            # ✅ parameterised SQL, one file per table area
│               └── utils/                   # ✅ jwt, password, requireAuth, httpError, dates
├── libs/
│   ├── shared/types/  (@baa/types)          # ✅ SlotKey + hour maps, SlotStatus, Patient,
│   │                                        #    Availability/Appointment DTOs, AuthUser
│   └── web/ui/  (@baa/ui)                   # ✅ MUI theme + SLOT_COLORS + MIN_PASSWORD_LENGTH
├── db/
│   ├── schema.sql                           # ✅ idempotent DDL — `npm run db:schema`
│   └── apply.mjs
├── docs/
└── .claude/skills/
```

**Rule of thumb:** routes stay thin; SQL only in `repositories/`; business rules
in `services/`. `apps/api/tsconfig.app.json` `paths` include `@app/*` (→ `src/app/*`)
and `@baa/types`; the esbuild build has `bundle: true` so those aliases resolve at
runtime.

## Dependencies

### Installed now

**web:** `react`, `react-dom`, `react-router-dom`, `@mui/material`, `@emotion/react`, `@emotion/styled` · (`@tanstack/react-query` is installed but unused — remove or adopt)
**api:** `express`, `pg`, `dotenv`, `cors`, `bcryptjs`, `jsonwebtoken`
**build (dev):** `nx` + `@nx/{react,vite,node,esbuild,js,web,workspace}`, `vite`, `@vitejs/plugin-react`, `esbuild`, `typescript`, `tslib`, `@types/*`

No migration tool — schema lives in `db/schema.sql` (idempotent, `npm run db:schema`).
Date maths use the built-in `Date` on both sides; no `dayjs`. No `zod` — inputs
are hand-validated.

### Add when it's needed

| Package | When | For |
| --- | --- | --- |
| `nodemailer` | M6 | admin-cancellation emails (dev: console transport) |
| `@playwright/test`, `@axe-core/playwright` | verification harness | headless browser checks — see [verification.md](verification.md) |
| `@mui/x-charts` | only if the admin metrics ever need graphs (not planned) | — |
| eslint / a unit test runner | when you want them (M5) | — |

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
