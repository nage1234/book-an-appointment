# Spec 4 — Admin dashboard

Route: `/admin` · every `/api/admin/*` endpoint is behind `requireAdmin`
(rejects `401` with no token, `403` for a `customer` token).

Supersedes schema.md decision #6 ("just shows Welcome Admin"). Admins get a real
screen with four sections. All open questions are now resolved (see **Decisions**).

## Screens

`/admin` with four sections (tabs — cosmetic, decide at build):

1. **Holidays**
2. **Manual booking**
3. **Metrics**
4. **Dormant customers**

Uses the same MUI theme / `ui-components` rules as the rest of the app.

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
| GET | `/api/admin/customers` | `?q=` | `{ customers: [{ id, name, email_id }] }` |
| GET | `/api/admin/customers/{id}/patients` | — | `{ patients: [...] }` |
| POST | `/api/admin/appointments` | `{ patientId, date, slot }` | `201 { appointment }` |
| POST | `/api/admin/appointments/{id}/cancel` | — | `200 { appointment }` |
| GET | `/api/admin/metrics` | `?period=this_month\|last_month\|this_year\|last_year` | `{ period, totalAppointments, perCustomer: [...], totals: {...} }` |
| GET | `/api/admin/customers/dormant` | — | `{ customers: [...] }` |

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

## Out of scope

Editing / deleting customers or patients · creating other admin accounts ·
rescheduling · charts / graphs · CSV export · emails other than the
admin-cancellation notice · an audit log of admin actions.

## Done when

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
