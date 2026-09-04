# Spec 1 — Authentication

## Goal

Customers and admins log in with email + password. Customers can self‑register
and recover a forgotten password. Mockups will be provided; this spec is the
behaviour behind them.

## Screens (web — `libs/web/feature-auth`)

| Route | Screen | Who |
| --- | --- | --- |
| `/login` | Email + password, "Forgot password?" link, "Create account" link | everyone (default when logged out) |
| `/register` | Name, email, password, confirm password | customers only |
| `/forgot-password` | Email field → "we sent you a link" confirmation | everyone |
| `/reset-password?token=…` | New password + confirm | via emailed link |

All forms: `react-hook-form` + `zod`. MUI `TextField`, `Button`, `Alert` for errors.

## Rules

- Email is case‑insensitive; stored and compared lower‑cased.
- Password: min 8 chars (keep it simple — length only).
- Passwords hashed with bcrypt (cost 10). Never returned by any endpoint.
- On success the API returns `{ token, user: { id, name, email_id, type } }`.
  Web stores `token` + `user` in the `auth` redux slice **and** `localStorage`
  (key `baa.auth`) so a refresh keeps you logged in.
- RTK Query attaches `Authorization: Bearer <token>` to every request.
- `401` from any API call → clear the slice → redirect to `/login`.
- Registration always creates `type = customer`. Admins are created manually
  (seed migration / direct DB), not through the app.

## Redirects after login

| user.type | lands on |
| --- | --- |
| `customer` | `/dashboard` |
| `admin` | `/admin` (placeholder page for now — see schema.md open decision #6) |

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

- `libs/api/auth`: `hashPassword`, `verifyPassword`, `signToken`, `verifyToken`,
  `requireAuth` (sets `req.user`), `requireAdmin`.
- `libs/api/data-access`: `customersRepo` (`findByEmail`, `create`, `updatePassword`),
  `passwordResetRepo`.
- `apps/api/src/routes/auth.ts`: validate with zod → call services → respond.

## Done when

- New customer can register, is logged straight in, lands on `/dashboard`.
- Existing customer/admin can log in and is routed by type.
- Wrong password shows an inline error, no crash.
- Forgot → reset with the emailed link works; expired/used token is rejected.
- Refreshing the browser keeps the session; `401` anywhere logs the user out.

## Out of scope

Social login, email verification on signup, "remember me" toggle, refresh
tokens, rate limiting (add later), admin user management UI.
