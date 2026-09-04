# Spec 2 — Dashboard (availability calendar)

## Goal

After login a customer sees one screen: pick a **year** and a **month**, then a
horizontally‑scrollable grid showing every day of that month and, under each day,
the 6 time slots colour‑coded by availability.

Route: `/dashboard` · lib: `libs/web/feature-dashboard`

## Controls (top of page)

- **Year** — MUI `Select`. Range: current year and next year (see schema open decision #5). Default: current year.
- **Month** — MUI `Select`, January…December. Default: current month.
- Changing either re‑fetches availability for that `year`+`month`.

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

## Cell colours (`SlotStatus`)

Computed **by the API** per (date, slot) and sent to the client. Client just paints.

| Colour | Meaning | Interactive? |
| --- | --- | --- |
| 🟥 red | Slot booked by **someone else** | No |
| 🟦 blue | Slot booked by **you** | Click the corner indicator → status / cancel popover (Spec 3) |
| 🟩 green | **Available** to book | Click → booking confirm dialog (Spec 3) |
| ⬜ grey | **Unavailable** — the whole day column is greyed when the date is a **Sunday**, a **public holiday**, or **in the past** | No |

When a day is greyed, all 6 of its cells are grey regardless of bookings, and
nothing in that column is clickable.

## Corner status indicator

- On every cell where **you** hold an appointment (blue cells), show a small
  **red triangle in the bottom‑right corner** of the cell.
- Clicking the indicator opens a **popover** anchored to it showing the
  appointment status — `Booked`, `In Progress`, or `Completed` — and, when the
  status is `Booked`, a **Cancel appointment** action (Spec 3).
- (Point 8 of the requirement: the indicator's job is to surface status on click.
  It only appears on your own bookings.)

## Data — `GET /api/availability?year=YYYY&month=M`

Auth: Bearer (needs to know who "you" are for blue vs red).

Response:
```jsonc
{
  "year": 2026,
  "month": 9,
  "daysInMonth": 30,
  "days": [
    {
      "date": "2026-09-01",
      "weekday": "Mon",          // dayjs short name
      "greyed": false,
      "greyedReason": null,       // "sunday" | "holiday" | "past" | null
      "slots": [
        {
          "slot": "S10_11",
          "status": "green",      // red | blue | green | grey
          "appointment": null      // when blue: { id, status: "booked"|"in_progress"|"completed" }
        }
        // …6 entries, always in fixed slot order
      ]
    }
    // …one entry per day of the month
  ]
}
```

### How the API computes it (`libs/api/availability`)

1. `daysInMonth`, weekday per day — dayjs.
2. Load `holidays` in `[month start, month end]` → set of dates.
3. Load `appointments` in that range where `status <> 'cancelled'`, grouped by
   `(date, slot)`.
4. For each day × slot:
   - day is Sunday / holiday / before today → `grey`
   - else appointment by `req.user.id` → `blue` (+ appointment `{id,status}`)
   - else appointment by anyone else → `red`
   - else → `green`

## State (web)

- RTK Query endpoint `getAvailability({year, month})`, cache key on the args.
- Booking / cancelling (Spec 3) `invalidatesTags: ['Availability']` so the grid
  refetches and repaints — no manual cell mutation.
- `year` / `month` selections held in local component state (or a tiny
  `dashboard` slice) — not persisted.

## Done when

- Selecting a year+month renders the correct number of day columns with correct weekdays.
- Sundays and seeded holidays render as fully grey, non‑clickable columns.
- Past dates in the current month are grey.
- A slot someone else booked is red; your own booking is blue with a corner indicator.
- The grid scrolls horizontally with header row and slot labels pinned.
- Clicking a blue cell's indicator shows the appointment status.

## Out of scope

Week view, day view, filtering, search, admin's view of all bookings,
timezone selection (server + client both assume the clinic's local timezone).
