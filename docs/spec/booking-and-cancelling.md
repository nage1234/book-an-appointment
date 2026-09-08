# Spec 3 — Booking & cancelling

Lib: `libs/web/booking` (`@baa/web-booking`) · api: `libs/api/appointments`

Every booking is for the **currently selected patient** (Spec 2's patient
selector) — not the logged-in customer directly.

## A. Book a slot

**Trigger:** customer clicks a 🟩 green cell in the dashboard grid.

**Flow:**
1. A **confirmation dialog** opens: *"Book an appointment for {patient name} on Wed, 12 Sep, 3:00–4:00 PM?"* with **Cancel** / **Yes, book**.
2. On **Yes, book** → `POST /api/appointments { date, slot, patientId }` (the currently selected patient).
3. On `201`:
   - Close the dialog, show a success snackbar.
   - Re-fetch availability → that cell is now 🟦 blue with the red corner indicator, status `Booked`.
4. On error:
   - `409` (slot taken since the grid loaded, or this patient already has an
     active booking) → snackbar with the specific reason (see below), refetch grid.
   - `400` (past date, Sunday, or outside the 3-month booking horizon) → snackbar *"That slot can't be booked"*.
   - `403` (`patientId` doesn't belong to this customer) → shouldn't happen from the UI; treat as a bug.

**Server rules (`bookAppointment`):**
- Reject (`400`) if `date` is in the past, a Sunday, or outside the booking
  horizon — current month through the end of the 2nd following month (schema.md
  decision #5).
- Reject (`400`) if `slot` is not one of the 6 `SlotKey`s.
- Reject (`403`) if `patientId` doesn't belong to `req.user.id` (join `patients`).
- Reject (`409`, *"This patient already has an active appointment"*) if this
  patient already holds a `booked` row whose slot hasn't ended yet (schema.md
  decision #1) — checked before inserting; a best-effort check, see Concurrency.
- Insert `appointments` row `{ patient_id: patientId, appointment_date, slot, status: 'booked' }`.
- The partial unique index `(appointment_date, slot) WHERE status = 'booked'`
  enforces one‑booking‑per‑slot at the DB level, for any patient → catch the
  unique violation and return `409` (*"That slot is no longer available"*).

## B. Cancel a booking

**Trigger:** customer clicks the selected patient's 🟦 blue cell.

**Flow:**
1. A **dialog** opens showing the appointment line (*"{patient} — Wed, 12 Sep,
   3:00–4:00 PM — Booked"*).
2. If status is **`Booked`** *and* more than **1 hour** remains before the
   slot's start time: the dialog asks *"Do you want to cancel this appointment?"*
   with **Keep it** / **Yes, cancel**.
   - Otherwise (`Completed`, or `Booked` but within 1 hour of start): the dialog
     shows status only and a single **Close** button — no cancel action.
3. On **Yes, cancel** → `POST /api/appointments/{id}/cancel`.
4. On `200`:
   - Close the dialog, success snackbar.
   - Re-fetch availability → cell is 🟩 green again, indicator gone.
5. On `409` (too close to start time, already completed, or already cancelled)
   → snackbar *"This appointment can no longer be cancelled"*, refetch.

**Server rules (`cancelAppointment`):**
- Load the appointment (joined to `patients`); `404` if not found.
- `403` if `patients.customer_id !== req.user.id` (i.e. the appointment isn't for
  one of this customer's patients). This holds regardless of `created_by` — a
  customer can cancel an appointment an admin booked for their patient.
- `409` unless `status === 'booked'` **and** the slot's start time is more than
  1 hour away (schema.md decision #3).
- Set `status = 'cancelled'`, `updated_at = now()`. The slot is immediately free
  (the partial unique index ignores cancelled rows), and this patient can book a
  new appointment right away.
- A **customer** self-cancel sends no email. **Admin**-initiated cancellations do
  — see [admin-dashboard.md](admin-dashboard.md#cancellation-emails).

## C. "My appointments" (supporting)

`GET /api/appointments/me?patientId=ID` → list of that patient's non‑cancelled
appointments `{ id, date, slot, status }` (patient must belong to the logged-in
customer; `status` here is the derived `booked`/`completed` value). Used by the
dashboard to render blue cells / indicators without scanning the whole
availability payload, and available for a future "appointments list" screen.

## API summary

| Method | Path | Body | Returns | Auth |
| --- | --- | --- | --- | --- |
| POST | `/api/appointments` | `{ date, slot, patientId }` | `201 { appointment }` | Bearer |
| POST | `/api/appointments/{id}/cancel` | — | `200 { appointment }` | Bearer (patient's owner) |
| GET | `/api/appointments/me?patientId=ID` | — | `200 { appointments: [...] }` | Bearer |

`appointment` shape: `{ id, patientId, date, slot, status, createdAt }` — `status` is `booked | completed | cancelled` (derived, see schema.md).

Errors: `400` invalid slot/date/out-of-horizon · `401` no token · `403` not this customer's patient · `404` unknown id · `409` slot taken / patient already has an active booking / not cancellable.

## Concurrency

- **Same slot, two different patients booking at once:** both may pass the
  app‑level check, but the DB partial unique index lets only one `INSERT` win.
  The loser gets a unique‑violation → mapped to `409`.
- **Same patient double-booking from two tabs:** the "one active appointment
  per patient" rule is an app-level check (it depends on the clock, so it can't
  be a static DB constraint) — there's a small race window between the check
  and the insert. Acceptable for now given the low stakes; revisit only if it
  becomes a real problem.

## Done when

- Clicking green → confirm → Yes books the slot for the selected patient; cell turns blue with indicator.
- Booking a slot another tab just took shows a clean `409` message and the grid corrects itself.
- A patient who already has an active booking gets a clear `409` trying to book a second one.
- Clicking a `Booked` blue cell more than 1 hour before start → dialog → Yes, cancel → frees the slot (turns green).
- Within 1 hour of the slot start (or once it's `Completed`), the dialog shows status only, no cancel action.
- A customer cannot cancel an appointment that isn't one of their patients' (`403`).
- A past date/time cell where the selected patient was `Booked` shows as `Completed`, still with the blue indicator.
- Past dates are greyed out except the selected patient's own booked/completed dates.

## Out of scope

Rescheduling (cancel + rebook instead), recurring appointments, waitlist,
notifications/reminders. (Admin booking/cancelling on a customer's behalf is in
[admin-dashboard.md](admin-dashboard.md).)
