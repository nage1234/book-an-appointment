# Architecture

## Tech stack

| Layer | Choice |
| --- | --- |
| Monorepo | **Nx** (single repo for web + api + shared libs) |
| Frontend | **React** + **React Router** |
| State | **Redux Toolkit** + **RTK Query** (RTK Query handles all server data; a small `auth` slice holds the session). Plain React state for local UI. |
| UI kit | **Material UI** — `@mui/material @emotion/react @emotion/styled @mui/icons-material`. Styling via MUI's `sx` / `styled` (Emotion, CSS‑in‑JS). No separate CSS files. Design tokens (buttons, typography, colours, links) live in the shared theme — see the `ui-components` skill. |
| Dates | **dayjs** (month length, weekday, Sunday detection) on both web and api |
| Backend | **Node.js** + **Express** (TypeScript) |
| DB | **Supabase Postgres**, connected directly from Node with the `pg` driver over the Direct Connection string. No Supabase client SDK. |
| Migrations | **node-pg-migrate** (plain SQL/JS migrations run by Node against the same connection string) |
| Auth | JWT (access token) + bcrypt password hashing |

## Nx monorepo layout

```
book-an-appointment/
├── apps/
│   ├── web/                     # React app (Vite bundler)
│   ├── web-e2e/
│   ├── api/                     # Express app
│   │   └── src/
│   │       ├── main.ts          # bootstrap, listen
│   │       ├── app.ts           # express app, middleware, route mount
│   │       └── routes/          # thin route files -> call lib services
│   └── api-e2e/
├── libs/
│   ├── shared/
│   │   └── types/               # DTOs & enums shared by web + api
│   │                            #   Customer, Appointment, SlotKey,
│   │                            #   SlotStatus, AppointmentStatus, DayAvailability
│   ├── web/
│   │   ├── ui/                  # MUI theme + shared presentational components
│   │   ├── data-access/         # redux store, RTK Query `api`, auth slice, hooks
│   │   ├── feature-auth/        # login, register, forgot-password, reset-password
│   │   ├── feature-dashboard/   # year/month selectors + calendar table
│   │   └── feature-booking/     # book dialog, cancel popover, status popover
│   └── api/
│       ├── data-access/         # pg Pool + repositories (customers, appointments, holidays)
│       ├── auth/                # hashing, jwt sign/verify, requireAuth / requireAdmin middleware
│       ├── availability/        # builds the month availability grid
│       └── appointments/        # book / cancel / list-mine services + rules
├── db/
│   └── migrations/              # node-pg-migrate files
├── docs/
└── .claude/skills/              # repeatable workflows (scaffold, endpoint, feature, migration)
```

**Rule of thumb:** apps are thin (wiring only); all logic lives in `libs`.
Web features never talk to `fetch` directly — only through the RTK Query `api`
in `libs/web/data-access`. API routes never run SQL directly — only through
repositories in `libs/api/data-access`.

## Node.js libraries

**Runtime**
- `express` — HTTP server
- `pg` — Postgres/Supabase driver (connection pool)
- `jsonwebtoken` — issue/verify access tokens
- `bcryptjs` — password hashing
- `zod` — request body/query validation (schemas shared conceptually with `libs/shared/types`)
- `dayjs` — date maths
- `cors`, `helmet`, `compression` — standard middleware
- `pino`, `pino-http` — logging
- `dotenv` — load `DATABASE_URL`, `JWT_SECRET`, etc.
- `http-errors` — typed HTTP errors
- `nodemailer` — forgot‑password email (dev: log the link to console / Ethereal)

**Tooling / dev**
- `node-pg-migrate` — migrations
- `jest`, `ts-jest`, `supertest` — api tests
- `@types/*` for the above

## Frontend libraries

- `react`, `react-dom`, `react-router-dom`
- `@reduxjs/toolkit`, `react-redux`
- `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/icons-material`
- `dayjs`
- `react-hook-form`, `zod`, `@hookform/resolvers` — auth forms
- `@testing-library/react` + Vitest/Jest — component tests

## Environment variables

| Var | Used by | Example |
| --- | --- | --- |
| `DATABASE_URL` | api, migrations | `postgresql://postgres:<pw>@db.adtzwdoturygbvjmlizv.supabase.co:5432/postgres` |
| `JWT_SECRET` | api | random 32+ char string |
| `JWT_EXPIRES_IN` | api | `12h` |
| `WEB_ORIGIN` | api (CORS) | `http://localhost:4200` |
| `SMTP_*` | api (nodemailer) | optional in dev |
| `VITE_API_URL` | web | `http://localhost:3000/api` |

Never commit real credentials. `.env` is git‑ignored; a `.env.example` is committed.

## API conventions

- Base path `/api`.
- JSON only. Auth via `Authorization: Bearer <token>`.
- Success: `200/201` with the resource. Error: `{ error: { message, code? } }` with a 4xx/5xx status.
- All dates in payloads are ISO `YYYY-MM-DD` strings; slots are identified by `SlotKey` (see schema.md).
