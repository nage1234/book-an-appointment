# Spec 4 — Admin dashboard

**Status: built (M6)** — API + UI done, verified via API tests; browser visual
check still pending (Playwright).

Route: `/admin` · every `/api/admin/*` endpoint is behind `requireAdmin`
(rejects `401` with no token, `403` for a `customer` token).

Supersedes schema.md decision #6 ("just shows Welcome Admin"). Admins get a real
screen — vertical **Dashboard / Reports** tabs (see **Screen layout**). All open
questions are resolved (see **Decisions**).

## Screen layout

`/admin` is behind an **admin-only route guard** (`<RequireAuth role="admin">`) —
a `customer` token there is redirected to `/dashboard`. Login routes by type:
`admin → /admin`, `customer → /dashboard`.

The page header reuses the customer dashboard's — big title ("Appointment
Booking System"), subtitle, and the avatar/profile menu (initials + name from
`useAuth()`, "Sign out").

Below the header, a **vertical MUI `Tabs`** (`orientation="vertical"`) with two
items:

| Tab | Contents |
| --- | --- |
| **Dashboard** | the shared availability dashboard (below) + a **Customer** selector + a **Holidays** panel |
| **Reports** | **Metrics** + **Dormant customers** (sections 3–4) |

### Shared availability dashboard

`AvailabilityDashboard` is **one component**, used by both `/dashboard` and the
admin Dashboard tab. It branches on `useAuth().user.type`:

| | Customer (`/dashboard`) | Admin (Dashboard tab) |
| --- | --- | --- |
| Patient list source | `GET /api/patients` (own) | `GET /api/admin/customers/{id}/patients` for the selected customer |
| **Customer selector** | hidden | MUI `Select` above the patient selector, listing every customer as **`Name (email@x.com)`**, from `GET /api/admin/customers`. Changing it clears the patient selection and reloads that customer's patients. |
| Availability | `GET /api/availability?year&month&patientId` | same endpoint — the ownership check on `patientId` is **skipped for admin tokens** |
| Book (green cell) | `POST /api/appointments` | `POST /api/admin/appointments` (`created_by='admin'`, bypasses per-patient limit / horizon / 1-hour window) |
| Cancel (blue cell) | `POST /api/appointments/{id}/cancel` (1-hour rule) | `POST /api/admin/appointments/{id}/cancel` (any time) → cancellation email |
| Add-patient dialog | yes | yes — `POST /api/admin/customers/{id}/patients` (or `POST /api/patients` with `customerId` for admins) |
| "Appointment for" default | the `self` patient | none until a customer is picked |

Until an admin picks a customer, the patient selector and grid are disabled with
a "Select a customer to begin" hint.

### Holidays panel (Dashboard tab, admin only)

A small panel beside/under the grid: a date field + description + **Add**, and a
list of upcoming holidays each with a **Remove** button. Wired to
`GET/POST/DELETE /api/admin/holidays`. Adding one greys that column on the grid
immediately (refetch availability) and reports `cancelledCount` in a snackbar.

There is **no separate mockup** — reuse `book_appointment.png`'s look (same grid,
same selectors styled the same) plus the two extra controls above.

---

## 1. Holidays

Admin maintains the clinic's holiday list. A date in `holidays` greys out
**entirely** on the customer dashboard (all 6 slots, non-clickable) — exactly
like a Sunday.

- **List** — every holiday (`holiday_date`, `description`), soonest first.
- **Add** — MUI date picker + a short description → `POST /api/admin/holidays`.
  Reject a date in the past, or one that's already a holiday.
- **Adding a holiday cancels the bookings on that date.** Every `booked`
  appointment whose `appointment_date` matches is set to `cancelled`, and each
  affected customer is emailed (see [Cancellation emails](#cancellation-emails)).
  The response tells the admin how many were cancelled:
  `201 { holiday, cancelledCount }`.
- **Delete** — removes the holiday; the date becomes bookable again. Already-
  cancelled appointments are **not** restored.

## 2. Manual booking for a customer's patient

Admin books a slot on someone's behalf — e.g. a phone booking.

Flow:
1. **Pick a customer** — search by name or email (`GET /api/admin/customers?q=`).
2. **Pick that customer's patient** — dropdown (`GET /api/admin/customers/:id/patients`).
3. **Pick date + slot** — a month grid like the customer dashboard (reuse the
   availability view, read-only colours) or a simple date + slot form.
4. **Confirm** → `POST /api/admin/appointments { patientId, date, slot }` →
   inserts with `created_by = 'admin'`.

Rules:
- **Bypasses** the per-patient "one active appointment" limit, the 3-month
  booking horizon, and the 1-hour cancellation window — an admin acting is
  assumed to be handling something urgent.
- Still cannot book a slot that's already `booked`, a **Sunday**, or a
  **holiday** (`409` / `400`).
- **Admin cancel** — `POST /api/admin/appointments/{id}/cancel`, any time, any
  appointment. Sends the cancellation email.
- An **admin-created appointment can still be cancelled by the owning customer**
  through the normal customer flow (ownership is `patients.customer_id`, not who
  created it). A customer self-cancel does **not** send an email.

## Cancellation emails

Any **admin-initiated** cancellation (a holiday wiping a date, or an explicit
admin cancel) emails the owning customer (`customers.email_id`). Fixed body:

> Due to unforeseen circumstances, the booking is cancelled. We are extremely
> sorry for the inconvenience caused. Please book another available slot, or for
> anything urgent, please call us.

- Needs a mailer — add `nodemailer` (M6). Dev: log the email to the console
  (Ethereal / console transport). Prod: `SMTP_*` env vars.
- Best-effort: a failed send is logged, not surfaced to the admin — the
  cancellation still stands.
- Customer self-cancellations send nothing.

## 3. Metrics

Plain numbers, shown as stat cards + one table. **No charting library** — these
are `COUNT` / `GROUP BY` queries. If graphs are wanted much later, add
`@mui/x-charts` (MUI family, one package) — not now.

`GET /api/admin/metrics` returns, for the four **calendar** periods
**this month / last month / this year / last year**:
- total **appointments** (non-cancelled) in the period

Plus **appointments per customer** — for each customer, the count of their
appointments *summed across all their patients* (patients are many-to-one on
customer), for the selected period. Rendered as a table, sortable by count.

Plus all-time totals: total customers, total patients, total appointments.

Extendable later: busiest slots, cancellation rate, new customers per month.

## 4. Dormant customers — registered but never booked

A re-engagement list: `type = 'customer'` accounts with **zero** non-cancelled
appointments across all their patients.

`GET /api/admin/customers/dormant` → rows of
`{ id, name, email_id, created_at, patient_count }`.

```sql
select c.id, c.name, c.email_id, c.created_at,
       count(p.id) as patient_count
from customers c
left join patients p on p.customer_id = c.id
where c.type = 'customer'
  and not exists (
    select 1 from patients p2
    join appointments a on a.patient_id = p2.id and a.status <> 'cancelled'
    where p2.customer_id = c.id
  )
group by c.id;
```

---

## API summary (`/api/admin/*`, all `requireAdmin`)

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | `/api/admin/holidays` | — | `{ holidays: [{ holiday_date, description }] }` |
| POST | `/api/admin/holidays` | `{ date, description }` | `201 { holiday, cancelledCount }` |
| DELETE | `/api/admin/holidays/{date}` | — | `200 { ok: true }` |
| GET | `/api/admin/customers` | `?q=` (optional) | `{ customers: [{ id, name, email_id }] }` — all customers when `q` is absent |
| GET | `/api/admin/customers/{id}/patients` | — | `{ patients: [...] }` |
| POST | `/api/admin/customers/{id}/patients` | `{ name, age?, gender?, relation }` | `201 { patient }` |
| POST | `/api/admin/appointments` | `{ patientId, date, slot }` | `201 { appointment }` |
| POST | `/api/admin/appointments/{id}/cancel` | — | `200 { appointment }` |
| GET | `/api/admin/metrics` | `?period=this_month\|last_month\|this_year\|last_year` | `{ period, totalAppointments, perCustomer: [...], totals: {...} }` |
| GET | `/api/admin/customers/dormant` | — | `{ customers: [...] }` |

`GET /api/availability` is **shared** — it just skips the `patientId` ownership
check when the token is an admin's, so the admin dashboard reuses it directly.

Errors: `401` no token · `403` not an admin · `400` bad input · `404` unknown id · `409` slot taken.

## Data touched (see schema.md)

- **new** `holidays` table
- **new column** `appointments.created_by` — `'customer' | 'admin'`, not null,
  default `'customer'`. Set to `'admin'` by `POST /api/admin/appointments`.
- *(No `customers.last_login_at`, no `created_by_admin_id` FK — decided against.)*

## Decisions

1. **Holiday over existing bookings** → cancel them + email each customer the
   fixed message above. Applies to any admin-initiated cancellation.
2. **Admin booking overrides** → yes, bypasses the per-patient limit, the 3-month
   horizon, and the 1-hour window. Only slot-taken / Sunday / holiday still block.
3. **Tag admin bookings** → yes, but as a simple `appointments.created_by`
   (`customer` / `admin`) column, not an FK.
4. **`customers.last_login_at`** → no. Not tracked. `created_by` on the
   appointment covers "who booked it". Dormant list = "registered, never booked".
5. **CSV export of the dormant list** → out of scope.
6. **Metrics** → count appointments, and **appointments per customer** (summed
   over that customer's patients). Not distinct-patient counts.
7. **Metrics periods** → calendar (this calendar month / year, etc.).
8. **Admin dashboard** -> title as per the admin login. Add an additional dropdown for customers name and email listing <customer name (email)> in the dropdown, based on the selection, patients name should list. (reuse the dashboard for both customer and admin as per the useAuth hook, to identify who has logged in)

## Out of scope

Editing / deleting customers or patients · creating other admin accounts ·
rescheduling · charts / graphs · CSV export · emails other than the
admin-cancellation notice · an audit log of admin actions.

## Done when

- Admin logs in → lands on `/admin`; a customer visiting `/admin` is redirected.
- `/admin` shows the vertical **Dashboard / Reports** tabs under the shared header.
- Dashboard tab: the **Customer** select lists everyone as `Name (email)`;
  picking one loads their patients; the grid then behaves like the customer
  dashboard but books/cancels via the admin endpoints.
- Admin adds a holiday → that date greys out on the customer dashboard, its
  bookings are cancelled, and those customers get the email. Deleting the holiday
  reopens the date (cancelled bookings stay cancelled).
- Admin books a slot for a chosen customer's patient (overriding the usual
  limits) → it shows blue for that patient, red for everyone else, and the
  owning customer can still cancel it.
- Admin cancels any appointment regardless of the 1-hour window → customer emailed.
- Admin sees total appointments for the four calendar periods and an
  appointments-per-customer table.
- Admin sees the list of customers who registered but never booked.
