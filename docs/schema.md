# Database schema (proposal — for your review)

You said you want to think over the schema. This is a minimal starting point.
Everything under **Open decisions** is a real fork in the road — pick and we lock it in.

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

**`appointment_status`**: `booked` | `in_progress` | `completed` | `cancelled`

**`SlotStatus`** (computed for the dashboard, not stored):
`red` (booked by someone else) · `blue` (booked by self) · `green` (available) · `grey` (unavailable — Sunday, holiday, or past)

## Tables

### `customers`  — matches the schema you gave
| column | type | notes |
| --- | --- | --- |
| `id` | `bigint` generated identity | **PK** |
| `name` | `text` | not null |
| `email_id` | `text` | not null, **unique** (store lower‑cased) |
| `password` | `text` | bcrypt hash, not null |
| `type` | `customer_type` | not null, default `customer` |
| `created_at` | `timestamptz` | default `now()` |

### `appointments`
| column | type | notes |
| --- | --- | --- |
| `id` | `bigint` generated identity | **PK** |
| `customer_id` | `bigint` | FK → `customers.id`, not null |
| `appointment_date` | `date` | not null |
| `slot` | `slot_key` | not null |
| `status` | `appointment_status` | not null, default `booked` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

Constraints:
- **One active booking per date+slot** (rule: "at a time one person can make only one appointment" for that slot):
  `CREATE UNIQUE INDEX ON appointments (appointment_date, slot) WHERE status <> 'cancelled';`
- Cancelling sets `status='cancelled'` (soft) so the slot frees up and history is kept.

### `holidays`
| column | type | notes |
| --- | --- | --- |
| `holiday_date` | `date` | **PK** |
| `description` | `text` | e.g. "Independence Day" |

A date is greyed if it is a Sunday **or** appears in `holidays` **or** is in the past.

### `password_reset_tokens`
| column | type | notes |
| --- | --- | --- |
| `id` | `bigint` identity | **PK** |
| `customer_id` | `bigint` | FK → `customers.id` |
| `token_hash` | `text` | sha‑256 of the emailed token |
| `expires_at` | `timestamptz` | e.g. now + 30 min |
| `used_at` | `timestamptz` | null until consumed |

## Open decisions (need your call)

1. **"One appointment at a time" — scope?**
   - (a) One active appointment per **date + slot** globally *(assumed above)*, plus a customer can't book a slot they already hold.
   - (b) Also: a customer may hold at most **one active appointment per day**.
   - (c) Also: a customer may hold at most **one active appointment total** until it completes.
2. **Who moves `booked → in_progress → completed`?** Admin action, or automatic by clock (slot start = in_progress, slot end = completed via a small cron)?
3. **Cancellation window** — can a customer cancel any `booked` appointment, or only up to N hours before the slot? Can they cancel once it's `in_progress`?
4. **Holidays** — seeded once by a migration, or managed by admin in an admin screen (out of the current 3 specs)?
5. **Booking horizon** — can customers book any future month, or only the current + next month?
6. **Admin role** — for now admin just logs in and lands somewhere. Do you want an admin dashboard in this phase, or later?
7. **`id` type** — `bigint` identity (above) vs `uuid`. Bigint is simpler; uuid hides sequence/counts.
8. **Email uniqueness across types** — one email = one account (a person is either customer or admin), correct?
