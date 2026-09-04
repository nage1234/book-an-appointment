# Spec 1 — Authentication

## Goal

Customers and admins log in with email + password. Customers can self‑register
and recover a forgotten password. Mockups will be provided; this spec is the
behaviour behind them.

## Screens (web — `libs/web/auth`, `@baa/web-auth`)

| Route | Screen | Who |
| --- | --- | --- |
| `/login` | Email + password, "Forgot password?" link, "Create account" link | everyone (default when logged out) |
| `/register` | Name, email, password, confirm password | customers only |
| `/forgot-password` | Email field → "we sent you a link" confirmation | everyone |
| `/reset-password?token=…` | New password + confirm | via emailed link |

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

`register` / `forgot-password` / `reset-password` reuse the same card shell,
logo, label style, and button.

### Responsive

All auth screens follow the responsive rules in the `ui-components` skill: the
card is fluid up to 400px and centred with page padding on phones; inputs and the
Sign in button are full‑width on `xs`. Must render cleanly at 360px wide.

## Rules

- Email is case‑insensitive; stored and compared lower‑cased.
- Password: min 8 chars (keep it simple — length only).
- Passwords hashed with bcrypt (cost 10). Never returned by any endpoint.
- On success the API returns `{ token, user: { id, name, email_id, type } }`.
  Web keeps `token` + `user` in `AuthContext` (`apps/web/src/app/AuthContext.tsx`
  — plain React Context, no Redux) and mirrors it to `localStorage` (key
  `baa.auth`) so a refresh keeps you logged in.
- `apiFetch` (`apps/web/src/app/apiFetch.ts`) adds `Authorization: Bearer <token>`
  to every request, reading it from `useAuth()`.
- `401` from any API call → `apiFetch` calls `logout()` → redirect to `/login`.
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

## Forgot / reset password flow

1. `POST /api/auth/forgot-password { email_id }`
   - Always responds `200 { ok: true }` (don't reveal whether the email exists).
   - If the email exists: create a random 32‑byte token, store its sha‑256 hash
     in `password_reset_tokens` with `expires_at = now + 30 min`, email a link
     `${WEB_ORIGIN}/reset-password?token=<raw token>`.
   - Dev: log the link to the console (nodemailer to Ethereal/console transport).
2. `POST /api/auth/reset-password { token, new_password }`
   - Hash the token, look up an unused, unexpired row → set the customer's
     password, set `used_at = now()`. Invalid/expired → `400`.
   - On success the user is sent to `/login` (they log in fresh).

## API

| Method | Path | Body | Returns | Auth |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | `{ name, email_id, password }` | `{ token, user }` | none |
| POST | `/api/auth/login` | `{ email_id, password }` | `{ token, user }` | none |
| GET | `/api/auth/me` | — | `{ user }` | Bearer |
| POST | `/api/auth/forgot-password` | `{ email_id }` | `{ ok: true }` | none |
| POST | `/api/auth/reset-password` | `{ token, new_password }` | `{ ok: true }` | none |

Errors: `400` validation, `401` bad credentials / bad token, `409` email already registered.

## Backend pieces

- Add `bcryptjs` + `jsonwebtoken` (M2). `zod` only if hand-validation gets ugly.
- `libs/api/auth`: `hashPassword`, `verifyPassword`, `signToken`, `verifyToken`,
  `requireAuth` (sets `req.user`), `requireAdmin`.
- `libs/api/data-access`: customer queries (`findByEmail`, `create`,
  `updatePassword`) + reset-token queries.
- `apps/api/src/routes/auth.ts`: validate input → call the above → respond.
- Forgot-password email: dev just logs the reset link to the console. Wire a real
  mailer (`nodemailer` or similar) only when it's needed.

## Done when

- New customer can register, is logged straight in, lands on `/dashboard`.
- Existing customer/admin can log in and is routed by type.
- Wrong password shows an inline error, no crash.
- Forgot → reset with the emailed link works; expired/used token is rejected.
- Refreshing the browser keeps the session; `401` anywhere logs the user out.

## Out of scope

Social login, email verification on signup, "remember me" toggle, refresh
tokens, rate limiting (add later), admin user management UI.
