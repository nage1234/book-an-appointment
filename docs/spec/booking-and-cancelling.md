# Spec 3 — Booking & cancelling

Lib: `libs/web/feature-booking` · services: `libs/api/appointments`

## A. Book a slot

**Trigger:** customer clicks a 🟩 green cell in the dashboard grid.

**Flow:**
1. A **confirmation dialog** opens: *"Book an appointment on Wed, 12 Sep, 3:00–4:00 PM?"* with **Cancel** / **Yes, book**.
2. On **Yes, book** → `POST /api/appointments { date, slot }`.
3. On `201`:
   - Close the dialog, show a success snackbar.
   - Invalidate the `Availability` cache → grid refetches → that cell is now 🟦 blue with the red corner indicator, status `Booked`.
4. On error:
   - `409` (slot taken since the grid loaded, or you already have a conflicting booking) → snackbar *"That slot is no longer available"*, refetch grid.
   - `400` (past date, Sunday, holiday) → snackbar *"That slot can't be booked"*.

**Server rules (`bookAppointment`):**
- Reject if `date` is in the past, a Sunday, or in `holidays`.
- Reject if `slot` is not one of the 6 `SlotKey`s.
- Insert `appointments` row `{ customer_id: req.user.id, appointment_date, slot, status: 'booked' }`.
- The partial unique index `(appointment_date, slot) WHERE status <> 'cancelled'`
  enforces one‑booking‑per‑slot at the DB level → catch the unique violation and return `409`.
- Also enforce the customer‑level "one at a time" rule chosen in schema.md
  decision #1 (default: they can't already hold this same date+slot). Return `409` if violated.

## B. Cancel a booking

**Trigger:** customer clicks the red **corner indicator** on their own 🟦 blue cell.

**Flow:**
1. A **popover** opens anchored to the indicator showing the status line
   (`Booked` / `In Progress` / `Completed`).
2. If status is **`Booked`**: the popover also shows *"Do you want to cancel this appointment?"* with **No** / **Yes, cancel**.
   - `In Progress` / `Completed`: popover shows status only, no cancel action.
3. On **Yes, cancel** → `POST /api/appointments/{id}/cancel`.
4. On `200`:
   - Close the popover, success snackbar.
   - Invalidate `Availability` → grid refetches → cell is 🟩 green again, indicator gone.
5. On `409` (already started/completed/cancelled) → snackbar *"This appointment can no longer be cancelled"*, refetch.

**Server rules (`cancelAppointment`):**
- Load the appointment; `404` if not found.
- `403` if `appointment.customer_id !== req.user.id`.
- `409` unless `status === 'booked'` (see schema.md decision #3 for whether a
  time cut‑off also applies).
- Set `status = 'cancelled'`, `updated_at = now()`. The slot is immediately free
  (the partial unique index ignores cancelled rows).

## C. "My appointments" (supporting)

`GET /api/appointments/me` → list of the current customer's non‑cancelled
appointments `{ id, date, slot, status }`. Used by the dashboard to render blue
cells / indicators without scanning the whole availability payload, and available
for a future "my appointments" list screen.

## API summary

| Method | Path | Body | Returns | Auth |
| --- | --- | --- | --- | --- |
| POST | `/api/appointments` | `{ date, slot }` | `201 { appointment }` | Bearer |
| POST | `/api/appointments/{id}/cancel` | — | `200 { appointment }` | Bearer (owner) |
| GET | `/api/appointments/me` | — | `200 { appointments: [...] }` | Bearer |

`appointment` shape: `{ id, date, slot, status, createdAt }`.

Errors: `400` invalid slot/date · `401` no token · `403` not owner · `404` unknown id · `409` slot taken / not cancellable.

## Concurrency

Two customers booking the same slot at once: both may pass the app‑level check,
but the DB partial unique index lets only one `INSERT` win. The loser gets a
unique‑violation → mapped to `409`. No app‑level locking needed.

## Done when

- Clicking green → confirm → Yes books the slot; cell turns blue with indicator.
- Booking a slot another tab just took shows a clean `409` message and the grid corrects itself.
- Clicking the indicator on a `Booked` cell → confirm → Yes frees the slot (turns green).
- A customer cannot cancel someone else's appointment (`403`) or a non‑`booked` one (`409`).

## Out of scope

Rescheduling (cancel + rebook instead), recurring appointments, waitlist,
notifications/reminders, admin cancelling on a customer's behalf.
