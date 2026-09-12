# Spec 1 — Authentication

## Goal

Customers and admins log in with email + password. Customers can self‑register
and recover a forgotten password. Mockups will be provided; this spec is the
behaviour behind them.

**Forgot password and change password are specified in detail in
[CR-1](../cr/CR-1-forgot-and-change-password.md)** — summarised here, that doc
is the source of truth for both.

## Screens (web — `apps/web/src/app/pages/authentication/`, `dashboard/`)

| Route / trigger | Screen | Who |
| --- | --- | --- |
| `/login` | Email + password, "Forgot password?" link, "Create account" link | everyone (default when logged out) |
| `/register` | Name, email, password, confirm password | customers only |
| `/forgot-password` | Email field → generates + emails a new password (CR-1) | everyone |
| "Change password" in the dashboard's profile menu | Dialog: email (read-only) / old / new / confirm password (CR-1) | logged-in customers & admins |

All forms: MUI `TextField`, `Button`, `Alert` for errors — controlled inputs with
`useState` and a small validate function. No form library.

### Login layout (from `docs/mockups/authentication.png`)

Centred card (`width: 100%`, `maxWidth: 400px`), vertically stacked:

1. Clinic **logo** (centred).
2. Label **"Enter your email address"** → bordered text input (full width).
3. Label **"Enter your password"** → bordered text input (full width).
4. **"Forgot password?"** link directly under the password input, left‑aligned,
   `#54A0D6`, size 16 (→ `/forgot-password`).
5. **"Sign in"** button — primary (`#54A0D6`, no border, bold 16), centred.
6. Footer line: **"Not registered yet? Sign up"** — "Sign up" is a `#54A0D6` link
   (→ `/register`).

`register` / `forgot-password` / `reset-password` reuse the same bordered card
shell, logo, label style, and buttons.

### Register screen (`/register`)

Reached from the "Sign up" link. Bordered card, titled "Customer Registration".
All four fields mandatory: **Name**, **Email**, **Password**, **Re-type password**.
Client checks: password ≥ 8 chars, and password === re-type. Two buttons:
**Submit** (primary) and **Cancel** (secondary → `/login`).

On success the user is sent **to `/login`** (with a "Account created. Please sign
in." success message) — registration does **not** auto-log-in, even though the
API returns a token. `useAuth().register()` deliberately ignores that token.

### Responsive

All auth screens follow the responsive rules in the `ui-components` skill: the
card is fluid up to 400px and centred with page padding on phones; inputs and the
Sign in button are full‑width on `xs`. Must render cleanly at 360px wide.

## Rules

- Email is case‑insensitive; stored and compared lower‑cased.
- Password: min 8 chars (keep it simple — length only).
- The client base64-encodes the password before sending it (`btoa` on web,
  `Buffer.from(x,'base64')` decode on the API). This is obfuscation only — it
  keeps the plain text out of the request body / logs; HTTPS is what protects it
  in transit. Applies to both `/auth/login` and `/auth/register`.
- Passwords hashed with bcrypt (cost 10) *after* decoding. Never returned by any endpoint.
- On success the API returns `{ token, user: { id, name, email_id, type } }`.
  Web keeps `token` + `user` in `AuthContext` — plain React Context, no Redux
  (`apps/web/src/app/pages/authentication/useAuth.tsx`, exporting `AuthProvider`
  + `useAuth()`) — and mirrors it to `localStorage` (key `baa.auth`) so a
  refresh keeps you logged in.
- A shared `fetch` wrapper will add `Authorization: Bearer <token>` to
  authenticated requests, reading it from `useAuth()`, and call `logout()` +
  redirect to `/login` on `401` (added when the first protected screen lands).
- Registration always creates `type = customer`. Admins are created manually
  (seed migration / direct DB), not through the app.
- Registration also auto-creates one `patients` row for the new customer
  (`name = customer.name`, `relation = 'self'`) — see schema.md and the
  dashboard spec's patient selector.

## Redirects after login

| user.type | lands on |
| --- | --- |
| `customer` | `/dashboard` |
| `admin` | `/admin` — placeholder page for now, just shows "Welcome Admin" (schema.md decision #6) |

A logged‑in user hitting `/login`, `/register`, etc. is bounced to their home route.
A logged‑out user hitting a protected route is bounced to `/login`.

## Forgot password + change password (CR-1)

**Forgot password** — no reset link, no token table. `POST /api/auth/forgot-password
{ email_id }` always responds `200 { ok: true }` (never reveals whether the email
is registered); if it is, the server generates a random password, hashes +
stores it, and emails the **plain generated password** to the customer. They
sign in with it, then are encouraged to change it.

**Change password** — from the dashboard's profile menu, authenticated.
`POST /api/auth/change-password { email_id, oldPassword, newPassword }`
(passwords base64-encoded per the usual convention) requires **both** a valid
session **and** the submitted email matching the session **and** the old
password verifying — a valid JWT alone doesn't let you change the password.

Full rules, UI, security trade-offs: [CR-1](../cr/CR-1-forgot-and-change-password.md).

## API

| Method | Path | Body | Returns | Auth |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | `{ name, email_id, password }` | `{ token, user }` | none |
| POST | `/api/auth/login` | `{ email_id, password }` | `{ token, user }` | none |
| POST | `/api/auth/forgot-password` | `{ email_id }` | `200 { ok: true }` always | none |
| POST | `/api/auth/change-password` | `{ email_id, oldPassword, newPassword }` | `200 { ok: true }` | Bearer |

Errors: `400` validation / old password incorrect / new password too short or
same as old, `401` bad credentials or missing/invalid token, `403` submitted
email doesn't match the session, `409` email already registered (register only).

## Backend pieces

Built flat under `apps/api/src/app/` (not the `libs/api/*` split the older docs
describe):

- `utils/password.ts` — `hashPassword` / `verifyPassword` (bcrypt).
- `utils/jwt.ts` — `signToken` / `verifyToken`, `AuthTokenPayload` (`sub` = customer id).
  Stateless: no session/token table. `requireAuth` / `requireAdmin` middleware
  land here when the first protected route does.
- `repositories/auth.ts` — `registerCustomer`, `findCustomerByEmail`,
  `updatePasswordByEmail` (parameterised SQL).
- `services/auth.ts` — `registerUser`, `loginUser`, and (CR-1) `forgotPassword`,
  `changePassword`. All `decodePassword()` the base64 first.
- `controllers/auth.ts` + `routes/auth.ts` — validate body, call the service,
  shape the response. Router mounted once at `/api/auth` in `main.ts`;
  `change-password` is the only route behind `requireAuth`.
- `utils/password.ts` also has `generateTempPassword()` (CR-1). `utils/mailer.ts`
  has `sendNewPasswordEmail()` — logs to the console in dev, `nodemailer`/SMTP_*
  in prod (same mailer built for admin cancellation emails).
- `zod` only if hand-validation gets ugly.

## Done when

- New customer can register (Name / Email / Password / Re-type password), then
  lands on `/login` with a success message and signs in.
- Registering an already-used email shows "That email is already registered" (`409`).
- Existing customer/admin can log in and is routed by type.
- Wrong password shows an inline error, no crash.
- Forgot-password on a registered email logs (console, dev) a new password that
  then logs in; on an unregistered email the response is identical (`{ok:true}`).
- Change-password: wrong old password / mismatched email / no token are each
  rejected with the right status; a correct change immediately invalidates the
  old password (new one is required to log in again).
- Refreshing the browser keeps the session; `401` anywhere logs the user out.

## Out of scope

Social login, email verification on signup, "remember me" toggle, refresh
tokens, rate limiting (add later), admin user management UI. See CR-1 for what's
deliberately out of scope in the forgot/change-password flows specifically.
