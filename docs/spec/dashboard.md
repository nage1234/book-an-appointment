# Spec 2 — Dashboard (availability calendar)

## Goal

After login a customer picks **which patient** they're booking for, then a
**year** and a **month**, and sees a horizontally‑scrollable grid of every day in
that month with the 6 time slots colour‑coded by availability.

Route: `/dashboard` · lib: `libs/web/dashboard` (`@baa/web-dashboard`)

## Controls (top of page, in this order)

1. **Patient** — MUI `Select`. See [Patient selector](#patient-selector) below.
2. **Year** — MUI `Select`. Default: current year.
3. **Month** — MUI `Select`. Default: current month.

**View window vs. booking horizon:**

- **View window** — the selectable `(year, month)` pairs run from **January of
  two calendar years ago** through the **end of the booking horizon** (current
  month + 2). This lets a customer look back at a patient's appointment history.
  `helpers.ts` `viewWindow()` builds the list; **Year**'s options are the
  distinct years among the pairs, and **Month**'s options are filtered to the
  months valid for the currently-selected year. Defaults: current year / current
  month. Changing patient, year, or month re‑fetches availability.
- **Booking horizon (schema.md decision #5)** — only the current month + the
  next two (3 months total) are bookable/editable (`helpers.ts` `bookingWindow()`
  / `isMonthEditable()`). Months before it are **read-only history**: every slot
  renders grey except the selected patient's own past bookings, which show as
  blue with a *Completed* status dialog (no cancel action). The API enforces
  this independently — see below.

## Patient selector

A customer can hold **multiple patients** — themself, mother, father, spouse,
child, friend, etc. Every appointment is booked *for* a patient, so the
dashboard needs to know which one before it can colour the grid.

- `GET /api/patients` loads the customer's patients once on dashboard mount:
  `[{ id, name, age, gender, relation }]`.
- The `Select`'s options are each patient's `name` (e.g. "John Doe", "Mother"),
  followed by a fixed **last item: "+ Add a new patient"**.
- Default selection: the patient with `relation = 'self'` (every customer has
  one — auto-created at registration, see schema.md), else the first patient.
- Selecting a patient re-fetches `GET /api/availability` for that patient.
- Selecting **"+ Add a new patient"** opens the add-patient dialog (below)
  instead of changing the current selection; if the dialog is cancelled, the
  selector reverts to whichever patient was selected before.

### Add-patient dialog — `docs/mockups/add_a_new_patient.png`

MUI `Dialog`, title **"Add New Patient"**, opened from the selector:

| Field | Input | Placeholder | Notes |
| --- | --- | --- | --- |
| Name | `TextField` | "Enter patient name" | required |
| Age | `TextField` (number) | "Enter age" | optional |
| Gender | `Select` — Male / Female / Other | "Select gender" | optional |
| Relation | `TextField` (**free text**) | "e.g. Self, Spouse, Child, Parent" | required |

Actions (bottom-right): **Cancel** (secondary button, closes without saving) /
**Add** (primary button, disabled until Name + Relation are non-empty).

On **Add**: `POST /api/patients { name, age, gender, relation }` → `201 { patient }`.
Add it to the in-memory patient list, select it, close the dialog, re-fetch
availability for the new patient (an unbooked patient's grid is all green/grey).

## The grid

- **Columns = days of the chosen month.** Count is 28 / 29 / 30 / 31, computed with
  dayjs (`dayjs(\`${year}-${month}-01\`).daysInMonth()`).
- Each **column header** shows the date number and the weekday name
  (e.g. `12` / `Wed`).
- **Rows = the 6 slots** (10–11, 11–12, 12–13, 2–3, 3–4, 4–5), labelled in a
  sticky left column.
- The grid **scrolls horizontally** from day 1 to the last day. Header row and the
  slot‑label column stay pinned. Vertical height fits the 6 rows without scroll.
- Built as a CSS‑grid / MUI `Box` table (not `<Table>` — simpler to make sticky +
  scrollable). Each slot cell is a fixed width (~96px) so scrolling feels even.

## Responsive

Follows the `ui-components` responsive rules. On phones the patient/year/month
selects stack full‑width, in the same top-to-bottom order; the grid keeps its
fixed slot‑cell width and is scrolled horizontally inside its container (the
page body never scrolls sideways). Slot label column and header row stay pinned
while scrolling.

## Cell colours (`SlotStatus`)

Computed **by the API**, relative to the **selected patient**, per (date, slot).
Client just paints.

| Colour | Meaning | Interactive? |
| --- | --- | --- |
| 🟥 red | Slot booked for **another patient** (anyone's — including the same customer's other patients) | No |
| 🟦 blue | Slot booked for **the selected patient** — status `Booked` or `Completed` | Click → cancel / status dialog (Spec 3) |
| 🟩 green | **Available** to book for the selected patient | Click → booking confirm dialog (Spec 3) |
| ⬜ grey | **Unavailable** — Sunday, an admin-set holiday, or a past slot not booked for the selected patient | No |

A day is greyed (all 6 cells grey, nothing clickable) when it's a **Sunday** or
an **admin-set holiday** (see [admin-dashboard.md](admin-dashboard.md)) — no
exception. A **past** day that is neither Sunday nor holiday is grey **except**
for slots booked for the selected patient:
those still show blue with a **derived** status of `Completed` (never stored —
see schema.md), so a patient's own history remains visible.

## Cell interaction

| Cell | Hover tooltip | Click |
| --- | --- | --- |
| 🟩 green | "Available — click to book" | opens the **booking confirmation dialog** (Spec 3 A) |
| 🟦 blue | "Booked for {selected patient name}" | opens the **cancel / status dialog** (Spec 3 B) |
| 🟥 red | "Booked (another patient)" — no name shown | nothing |
| ⬜ grey | the reason — "Sunday" / "Holiday" / "Past" | nothing |

Blue cells also carry a small **red triangle in the bottom-right corner** as a
visual marker of the selected patient's own bookings.

The cancel/status dialog shows the appointment status (`Booked` / `Completed`)
and, when status is `Booked` **and** more than 1 hour remains before the slot
starts, a **Cancel appointment** action. Inside the 1-hour window, or once
`Completed`, it shows status only.

## Data

### `GET /api/patients`
Auth: Bearer. Returns `{ patients: [{ id, name, age, gender, relation }] }` for
the logged-in customer, ordered `relation = 'self'` first, then by `created_at`.

### `POST /api/patients`
Auth: Bearer. Body `{ name, age?, gender?, relation }` → `201 { patient }`.
`customer_id` is always the logged-in customer — never accepted from the client.

### `GET /api/availability?year=YYYY&month=M&patientId=ID`
Auth: Bearer. `patientId` must belong to the logged-in customer (`403` if not).

Response:
```jsonc
{
  "year": 2026,
  "month": 9,
  "daysInMonth": 30,
  "patientId": 7,
  "days": [
    {
      "date": "2026-09-01",
      "weekday": "Mon",          // dayjs short name
      "greyed": false,
      "greyedReason": null,       // "sunday" | "holiday" | null (whole-column greying;
                                  //  past is per-slot: a slot's own status is "grey")
      "slots": [
        {
          "slot": "S10_11",
          "status": "green",      // red | blue | green | grey
          "appointment": null      // when blue: { id, status: "booked"|"completed" }
        }
        // …6 entries, always in fixed slot order
      ]
    }
    // …one entry per day of the month
  ]
}
```

### How the API computes availability (`libs/api/availability`)

1. `daysInMonth`, weekday per day — dayjs. Reject the request (`400`) if
   `year`/`month` fall outside the **view window** (`viewHorizon`: Jan of two
   years ago … end of the booking horizon). Months within the view window but
   before the booking horizon return normally, but every non-booked slot is
   `grey` (past), so history is visible without being editable. Booking and
   cancelling are gated separately in their own endpoints against the 3-month
   booking horizon (schema.md decision #5).
2. Load `holidays` in range → set of dates.
3. Load `appointments` in range where `status = 'booked'`, joined to `patients`
   for ownership, grouped by `(date, slot)`.
4. For each day × slot:
   - appointment's `patient_id === patientId` (the query param) → `blue`, with
     `appointment.status` = `'completed'` if the slot's end time has passed,
     else `'booked'` — **checked first**, so the selected patient's past
     bookings stay visible.
   - else day is Sunday, a holiday, or before today → `grey`
   - else appointment exists for any other patient → `red`
   - else → `green`

## State (web)

- `patients: Patient[]`, `selectedPatientId` in `useState`; loaded once on mount
  from `GET /api/patients`. `selectedPatientId` defaults to the `self` patient.
- `year` / `month` in `useState` (default: current year / current month). None
  of the three persisted. Selectable range is `viewWindow()` (2 years back …
  current + 2); only `bookingWindow()` months are editable.
- Whenever patient, year, or month change, call `GET /api/availability` through
  the shared `fetch` wrapper; hold the response in `useState`.
- After adding a patient, or after a booking/cancel (Spec 3) succeeds, just
  re-run the relevant GET and repaint — no manual cell mutation, no cache layer.

## Done when

- Patient select lists the customer's patients with "+ Add a new patient" last;
  a new customer sees their auto-created "Self" patient pre-selected.
- Adding a patient (name + relation, age/gender optional) shows it in the select,
  selected, with a blank (green/grey) grid.
- Selecting a different patient repaints the grid for that patient.
- Selecting a year+month renders the correct number of day columns with correct weekdays.
- Year/Month options span Jan of two years ago through current month + 2; months
  before the current month load as read-only history (all slots grey except the
  patient's own past bookings), and never past current month + 2.
- Sundays and admin-set holidays render as fully grey, non‑clickable columns.
- Past dates in the current month are grey, except any slot booked for the
  selected patient, which stays blue with status `Completed`.
- A slot booked for another patient is red; the selected patient's own booking is
  blue with a corner indicator.
- The grid scrolls horizontally with header row and slot labels pinned.
- Hovering a cell shows the right tooltip; a blue cell's tooltip names the selected patient.
- Clicking a green cell opens the booking dialog; clicking a blue cell opens the cancel/status dialog.

## Out of scope

Editing or deleting a patient, patient photo/documents, week/day view, filtering,
search, admin's view of all bookings, timezone selection (server + client both
assume the clinic's local timezone).
