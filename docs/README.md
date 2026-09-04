# book-an-appointment — Documentation

Appointment booking app for a psychiatric clinic. Patients ("customers") book
1‑hour consultation slots; admins manage the clinic.

## Index

| Doc | Purpose |
| --- | --- |
| [architecture.md](architecture.md) | Tech stack, Nx monorepo layout, folder structure, library list |
| [schema.md](schema.md) | Database schema + the reasoning behind every design decision |
| [plan.md](plan.md) | Build order / milestones |
| [spec/authentication.md](spec/authentication.md) | Login, register, forgot/reset password |
| [spec/dashboard.md](spec/dashboard.md) | Year/month controls + calendar availability table |
| [spec/booking-and-cancelling.md](spec/booking-and-cancelling.md) | Booking a slot, cancelling a slot |

## Guiding principle

Keep it simple. Every spec below is intentionally minimal — build exactly what
is described, nothing more. Anything uncertain is parked under **Open decisions**
in each doc rather than guessed at.
