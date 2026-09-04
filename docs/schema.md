# Database schema

All open decisions are now locked in (see **Decisions** at the bottom for the
record of what was picked and why). This is the schema to build against.

## Enums / constants

**`customer_type`**: `customer` | `admin`

**`SlotKey`** (fixed 6 one‑hour slots, no 1–2pm lunch):
| key | time |
| --- | --- |
| `S10_11` | 10:00–11:00 |
| `S11_12` | 11:00–12:00 |
| `S12_13` | 12:00–13:00 |
| `S14_15` | 14:00–15:00 |
| `S15_16` | 15:00–16:00 |
| `S16_17` | 16:00–17:00 |

Stored as a small string/enum column. The time mapping lives in `libs/shared/types`, not the DB.

**`appointment_status` (DB)**: `booked` | `cancelled` — only two values are ever
*written*. There's no `in_progress` and no cron. A third, **derived** value,
`completed`, is computed on read (never stored): a `booked` row is shown as
`completed` once its slot's end time is in the past, computed at request time
in `libs/api/availability` / `libs/api/appointments`. The **API‑facing**
`AppointmentStatus` type (`libs/shared/types`) is `booked | completed | cancelled` —
that's the 3-value type the web app sees; the DB enum stays 2-value.

**`patient_relation`**: `self` | `spouse` | `father` | `mother` | `child` | `sibling` | `friend` | `other`

**`gender`**: `male` | `female` | `other`

**`SlotStatus`** (computed for the dashboard, not stored) — relative to the
**selected patient**:
`red` (booked for someone else — any other patient) · `blue` (booked for the
selected patient) · `green` (available) · `grey` (unavailable — Sunday or past)

## Tables

### `customers`  — matches the schema you gave
| column | type | notes |
| --- | --- | --- |
| `id` | `bigint` generated identity | **PK** |
| `name` | `text` | not null |
| `email_id` | `text` | not null, **unique** (store lower‑cased) — one email = one account, customer or admin |
| `password` | `text` | bcrypt hash, not null |
| `type` | `customer_type` | not null, default `customer` |
| `created_at` | `timestamptz` | default `now()` |

### `patients` — the people a customer books appointments *for*

One customer account can hold multiple patients (self, mother, father, spouse,
child, friend, …). Every appointment belongs to a patient, not directly to a customer.

| column | type | notes |
| --- | --- | --- |
| `id` | `bigint` generated identity | **PK** |
| `customer_id` | `bigint` | FK → `customers.id`, not null — the account that manages this patient |
| `name` | `text` | not null |
| `age` | `smallint` | nullable |
| `gender` | `gender` | nullable |
| `relation` | `patient_relation` | not null |
| `created_at` | `timestamptz` | default `now()` |

**Assumption (flag if you disagree):** on registration the API auto-creates one
`patients` row for the new customer — `name = customer.name`, `relation = 'self'`
— so the patient select is never empty and a solo customer never has to fill the
"add patient" dialog just to book for themself.

### `appointments`
| column | type | notes |
| --- | --- | --- |
| `id` | `bigint` generated identity | **PK** |
| `patient_id` | `bigint` | FK → `patients.id`, not null — who the appointment is for |
| `appointment_date` | `date` | not null |
| `slot` | `slot_key` | not null |
| `status` | `appointment_status` | not null, default `booked` — DB only ever holds `booked`/`cancelled` (see enum note above) |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

The owning customer is reached via `patients.customer_id` — join, don't
denormalise. Ownership checks (can this customer cancel this appointment?)
compare `patients.customer_id` to the logged-in customer's id.

Rules, enforced as noted:

- **One booking per date+slot, for anyone** (DB constraint):
  `CREATE UNIQUE INDEX ON appointments (appointment_date, slot) WHERE status = 'booked';`
- **One active appointment per patient** (app-level check, in `bookAppointment` —
  can't be a static index because "active" depends on the current time): reject
  a new booking if this patient already has a row with `status = 'booked'`
  whose slot hasn't ended yet. Once that appointment's slot time passes it's
  `completed` (derived, see above) and no longer blocks a new booking; cancelling
  it early frees things up immediately too. A customer can hold many concurrent
  bookings across their *different* patients — the restriction is per patient.
- **Cancellation window**: only while `status = 'booked'` **and** more than
  **1 hour** remains before the slot's start time. Otherwise `409`.
- **Booking horizon**: `appointment_date` must be within the current month
  through the end of the **2nd following month** (3 months total, inclusive of
  today). Earlier or later → `400`.
- Cancelling sets `status = 'cancelled'` (soft) so the slot frees up and history is kept.

### `password_reset_tokens`
| column | type | notes |
| --- | --- | --- |
| `id` | `bigint` identity | **PK** |
| `customer_id` | `bigint` | FK → `customers.id` |
| `token_hash` | `text` | sha‑256 of the emailed token |
| `expires_at` | `timestamptz` | e.g. now + 30 min |
| `used_at` | `timestamptz` | null until consumed |

## Holidays

No `holidays` table for now. A day is greyed only if it's a **Sunday** or in the
past — that's it. Custom public holidays (an admin-managed list) are a later
addition if actually needed; nothing in the current 3 specs depends on it.

## Decisions

All previously-open questions, as answered:

1. **One appointment at a time** — per **patient**, and "active" means *not yet
   completed* (i.e. still `booked` and the slot hasn't passed): a patient can
   hold at most one such appointment. They can cancel it and book a different
   future date; once completed they can book again. A customer can book several
   patients into the same or different slots — the limit is per patient, not per customer.
2. **`in_progress` / cron** — dropped. Only `booked`/`cancelled` are stored;
   `completed` is computed from the clock on read. No cron job.
3. **Cancellation window** — up to 1 hour before the slot start; not cancellable after that.
4. **Holidays** — Sunday only for now, no table, no admin screen (see above).
5. **Booking horizon** — current month + the following two months (3 months total).
6. **Admin role** — logs in and lands on `/admin`, which for now just shows
   "Welcome Admin" (no admin dashboard functionality yet).
7. **`id` type** — `bigint` identity, as used throughout above.
8. **Email uniqueness** — one email = one account, confirmed.
